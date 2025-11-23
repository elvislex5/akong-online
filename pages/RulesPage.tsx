import React from 'react';
import { Link } from 'react-router-dom';

const RulesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-black mb-4">
            Règles du <span className="text-amber-500">Songo</span>
          </h1>
          <p className="text-xl text-gray-400">(Variante MPEM)</p>
        </div>

        {/* Rules Content */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-12 space-y-8">

            {/* Objectif */}
            <section className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">But du jeu</h2>
              </div>
              <p className="text-gray-300 leading-relaxed text-lg">
                Capturer <strong className="text-amber-500">plus de 35 graines</strong> (ou avoir plus de 35 points en fin de partie).
              </p>
            </section>

            <div className="border-t border-gray-700"></div>

            {/* Distribution */}
            <section className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Distribution</h2>
              </div>
              <p className="text-gray-300 leading-relaxed text-lg">
                On sème les graines <strong className="text-blue-400">une par une vers la droite</strong> (sens anti-horaire).
                Si on a plus de 14 graines, on fait un tour complet en sautant la case de départ.
              </p>
            </section>

            <div className="border-t border-gray-700"></div>

            {/* La Prise */}
            <section className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">La Prise (Capture)</h2>
              </div>
              <p className="text-gray-300 leading-relaxed text-lg">
                Si la dernière graine tombe <strong className="text-green-400">chez l'adversaire</strong> et que la case contient alors{' '}
                <strong className="text-green-400">2, 3 ou 4 graines</strong>, on capture ces graines (ainsi que celles des cases
                précédentes si elles remplissent la même condition).
              </p>
            </section>

            <div className="border-t border-gray-700"></div>

            {/* Règles Spéciales */}
            <section className="space-y-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Règles Spéciales</h2>
              </div>

              <ul className="space-y-6">
                <li className="bg-gray-900/50 p-6 rounded-xl border border-gray-700">
                  <h3 className="text-lg font-bold text-amber-400 mb-2">⚡ Auto-capture</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Si un tour complet se termine avec 1 graine restante (ex: 14, 28...), elle est{' '}
                    <strong>capturée automatiquement</strong>.
                  </p>
                </li>

                <li className="bg-gray-900/50 p-6 rounded-xl border border-gray-700">
                  <h3 className="text-lg font-bold text-blue-400 mb-2">🤝 Solidarité (Le Un)</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Si vous n'avez plus qu'une seule graine <em>et qu'elle est dans votre dernière case</em>,
                    vous l'auto-capturez. L'adversaire <strong>DOIT</strong> alors jouer un coup qui vous redonne
                    des graines (si possible).
                  </p>
                </li>

                <li className="bg-gray-900/50 p-6 rounded-xl border border-gray-700">
                  <h3 className="text-lg font-bold text-red-400 mb-2">🚫 Interdiction d'assécher</h3>
                  <p className="text-gray-300 leading-relaxed">
                    On ne peut pas capturer <strong>toutes les graines</strong> de l'adversaire d'un seul coup si
                    cela le prive de tout mouvement au tour suivant (sauf s'il n'y a pas d'autre choix).
                  </p>
                </li>
              </ul>
            </section>

            <div className="border-t border-gray-700"></div>

            {/* Fin de partie */}
            <section className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Fin de partie</h2>
              </div>
              <div className="bg-amber-900/20 border border-amber-700 rounded-xl p-6">
                <p className="text-gray-300 leading-relaxed text-lg">
                  La partie se termine quand un joueur <strong className="text-amber-400">capture plus de 35 graines</strong>,
                  ou quand aucun joueur ne peut jouer (dans ce cas, chacun garde ses graines restantes et on compte les points).
                </p>
              </div>
            </section>

          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            to="/game"
            className="inline-block px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl font-bold text-lg shadow-lg transform hover:-translate-y-1 transition-all"
          >
            Jouer maintenant
          </Link>
          <Link
            to="/"
            className="inline-block ml-4 px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-lg transition-all"
          >
            Retour à l'accueil
          </Link>
        </div>

      </div>
    </div>
  );
};

export default RulesPage;
