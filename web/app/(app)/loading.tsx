export default function AppLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 border-4 border-brand-100 dark:border-stone-800 rounded-full"></div>
        <div className="absolute w-24 h-24 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
        <span className="text-3xl animate-pulse">✨</span>
      </div>
      <div className="text-center space-y-2">
        <h2 className="font-display font-bold text-xl text-stone-700 dark:text-stone-300">A Síndica está carregando...</h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm">Buscando os registros da casa, aguarde.</p>
      </div>
    </div>
  );
}
