export default function ApiError({ message }: { message: string }) {
  return (
    <div role="alert" className="border-l-2 border-[var(--crit-fg)] py-1 pl-5">
      <p className="font-medium">{message}</p>
      <p className="mt-1 text-[14px] text-body">
        Start the API from <code className="font-mono text-[13px] text-ink">backend/</code> with{" "}
        <code className="font-mono text-[13px] text-ink">uvicorn main:app --reload</code>, then refresh.
      </p>
    </div>
  );
}
