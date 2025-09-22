export function Loading() {
    return <>
        <div className="w-screen h-screen flex items-center justify-center gap-1">
            <div className="select-none font-bold">加载中</div>
            <div className="icon-[line-md--loading-loop] w-6 h-6" />
        </div>
    </>;
}
