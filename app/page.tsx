export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex flex-col items-center justify-center p-6 text-white">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20 text-center max-w-md w-full">
        <h1 className="text-4xl font-bold mb-4">
          Али кот бома ошна .!
        </h1>
        <p className="text-lg text-blue-100 mb-8">
          Это мой первый серьезный сайт, созданный прямо на телефоне.
        </p>
        <button className="bg-white text-purple-600 font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform">
          Нажми на меня
        </button>
      </div>
    </main>
  );
}
