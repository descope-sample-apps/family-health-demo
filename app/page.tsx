import AuthGate from "./components/AuthGate";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 p-8 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Family Health
        </h1>
        <AuthGate />
      </main>
    </div>
  );
}
