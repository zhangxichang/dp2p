use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr},
    path::PathBuf,
    sync::Arc,
};

use clap::Parser;
use eyre::{Result, bail};
use iroh_relay::server::{
    AccessConfig, CertConfig, DEFAULT_CERT_RELOAD_INTERVAL, QuicConfig, RelayConfig,
    ReloadingResolver, Server, ServerConfig, TlsConfig,
};
use rustls_cert_reloadable_resolver::{CertifiedKeyLoader, key_provider::Dyn};
use serde::{Deserialize, Serialize};
use tokio::fs;

#[derive(Serialize, Deserialize)]
struct Config {
    bind_http_port: u16,
    bind_https_port: u16,
    bind_quic_port: u16,
    key_path: PathBuf,
    fullchain_path: PathBuf,
}

#[derive(Parser)]
struct Args {
    #[arg(long)]
    init: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .init();
    log::info!("日志开始记录");
    let mut server = {
        let args = Args::parse();
        if args.init {
            fs::write(
                "config.toml",
                toml::to_string_pretty(&Config {
                    bind_http_port: 10280,
                    bind_https_port: 10281,
                    bind_quic_port: 10282,
                    key_path: ".key".parse()?,
                    fullchain_path: ".cer".parse()?,
                })?,
            )
            .await?;
            log::info!("配置文件初始化成功");
            return Ok(());
        }
        log::info!("加载配置文件");
        let Ok(config_bytes) = fs::read("config.toml").await else {
            bail!("没有找到配置文件，使用--init初始化配置");
        };
        let config = toml::from_slice::<Config>(&config_bytes)?;
        log::info!("配置定期热加载证书文件");
        if !config.key_path.exists() || !config.fullchain_path.exists() {
            bail!("证书文件不存在");
        }
        let key_reader = rustls_cert_file_reader::FileReader::new(
            config.key_path,
            rustls_cert_file_reader::Format::PEM,
        );
        let certs_reader = rustls_cert_file_reader::FileReader::new(
            config.fullchain_path,
            rustls_cert_file_reader::Format::PEM,
        );
        let server_config_builder = rustls::ServerConfig::builder().with_no_client_auth();
        let certified_key_loader = CertifiedKeyLoader {
            key_provider: Dyn(server_config_builder.crypto_provider().key_provider),
            key_reader,
            certs_reader,
        };
        let server_config = server_config_builder.with_cert_resolver(Arc::new(
            ReloadingResolver::init(certified_key_loader, DEFAULT_CERT_RELOAD_INTERVAL).await?,
        ));
        log::info!("开始创建线程");
        let bind_ip = IpAddr::V4(Ipv4Addr::UNSPECIFIED);
        let quic_bind_addr = SocketAddr::new(bind_ip, config.bind_quic_port);
        Server::spawn(ServerConfig {
            relay: Some(RelayConfig {
                http_bind_addr: SocketAddr::new(bind_ip, config.bind_http_port),
                tls: Some(TlsConfig {
                    https_bind_addr: SocketAddr::new(bind_ip, config.bind_https_port),
                    quic_bind_addr,
                    cert: CertConfig::<rustls::ServerConfig>::Reloading,
                    server_config: server_config.clone(),
                }),
                limits: Default::default(),
                key_cache_capacity: None,
                access: AccessConfig::Everyone,
            }),
            quic: Some(QuicConfig {
                bind_addr: quic_bind_addr,
                server_config,
            }),
            metrics_addr: None,
        })
        .await?
    };
    log::info!("线程创建完毕，服务器已启动");
    tokio::select! {
        _ = tokio::signal::ctrl_c() => log::info!("用户手动结束"),
        _ = server.task_handle() => log::info!("程序自行退出"),
    }
    server.shutdown().await?;
    log::info!("服务器已关闭");
    Ok(())
}
