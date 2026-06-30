type DemoNoticeProps = {
  title?: string;
  children: string;
};

export function DemoNotice({ title = "デモ表示", children }: DemoNoticeProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-bold">{title}</p>
      <p className="mt-1 leading-6">{children}</p>
    </div>
  );
}
