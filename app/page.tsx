import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <nav className="flex items-center justify-between w-full max-w-3xl border-b border-gray-200 dark:border-gray-700 py-5 px-16 bg-white dark:bg-black">
          <Image
            src="/logo_sqloto.png"
            alt="SQLoto Logo"
            width={188}
            height={77}
          />
        </nav>
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-5 px-16 bg-violet-100 dark:bg-black sm:items-start">
          
        <h1 className="my-5 font-bold">Bienvenue sur SQLoto !</h1>
        <p>SQLoto vous permet de poser des questions sur l&apos;historique des tirages FDJ. Voici quelques exemples de questions que vous pouvez poser :</p>
        <ul className="list-disc ml-10 mb-5">
          <li>Quels sont les dix numéros les plus fréquents le mercredi ?</li>
            <li>Combien de fois le numéro 12 est-il sorti depuis janvier ?</li>
          <li>Quand les numéros 7 et 23 sont-ils sortis ensemble pour la dernière fois ?</li>
          <li>Compare la fréquence du numéro 4 en 2025 et en 2026.</li>
          <li>Quelle est la proportion de numéros pairs sur les cent derniers tirages ?</li>
          <li>Quel numéro n&apos;est pas apparu depuis le plus longtemps ?</li>
        </ul>
        <label htmlFor="sqlQuery" className="block mb-2">
          Veuillez entrer ci-dessous votre question sur l&apos;historique des tirages FDJ
        </label>
        
        <textarea name="sqlQuery" id="sqlQuery" placeholder="Enter your SQL query here..." className="border border-gray-500 p-2 w-full min-h-50"></textarea>
        <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">Exécuter la requête</button>
      </main>
    </div>
  );
}
