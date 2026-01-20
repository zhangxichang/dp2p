export default function AddFriend() {
  return (
    <div class="modal-box flex flex-col relative">
      <span class="absolute right-4 bottom-3 select-none text-base-content/60 text-sm">
        按<kbd class="kbd kbd-sm">ESC</kbd>关闭
      </span>
      <span class="text-base-content font-bold text-lg">添加好友</span>
      <span class="text-sm text-base-content/60">两地俱秋夕，相望共星河。</span>
      <div class="flex flex-col mt-3 gap-2">
        <div class="flex flex-col items-start">
          <span class="font-bold">搜索用户</span>
        </div>
      </div>
    </div>
  );
}
