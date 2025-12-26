import { useParams } from "@solidjs/router";

export default function Home() {
  //TODO slqie、endpint模块创建和实例创建分离，
  const params = useParams<{ user_id: string }>();
  return <div>主页，用户ID:{params.user_id}</div>;
}
