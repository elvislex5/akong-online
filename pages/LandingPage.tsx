import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const features = [
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      title: 'Multijoueur en ligne',
      description: 'Affrontez vos amis en ligne avec un simple code de salle. Aucune inscription nécessaire pour jouer !',
    },
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'IA intelligente',
      description: '3 niveaux de difficulté : du débutant au maître. L\'IA utilise l\'algorithme Minimax pour des défis stimulants.',
    },
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
      title: 'Modes variés',
      description: 'Local, en ligne, contre l\'IA ou mode laboratoire pour tester des stratégies. Choisissez votre style de jeu !',
    },
    {
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Temps réel',
      description: 'Animations fluides et synchronisation instantanée. Vivez chaque mouvement comme si vous étiez à côté de votre adversaire.',
    },
  ];

  const rules = [
    {
      step: '1',
      title: 'Distributez les graines',
      description: 'Choisissez une case et distribuez les graines une par une dans le sens anti-horaire.',
    },
    {
      step: '2',
      title: 'Capturez stratégiquement',
      description: 'Si la dernière graine tombe chez l\'adversaire créant 2, 3 ou 4 graines, capturez-les !',
    },
    {
      step: '3',
      title: 'Gagnez la partie',
      description: 'Premier à capturer plus de 35 graines remporte la victoire. Attention à la solidarité !',
    },
  ];

  return (
    <main className="min-h-screen bg-gray-900 text-white">

      {/* Hero Section */}
      <section className="relative overflow-hidden" aria-labelledby="hero-title">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 via-gray-900 to-gray-900"></div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: Text Content */}
            <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
              <div className="space-y-4">
                <h1 id="hero-title" className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-amber-500 to-amber-300 bg-clip-text text-transparent">
                    AKÔNG
                  </span>
                </h1>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-300">
                  Le Jeu du Songo
                </p>
                <p className="text-base sm:text-lg text-gray-300 max-w-xl mx-auto lg:mx-0">
                  Plongez dans la stratégie millénaire africaine. Capturez, distribuez, dominez.
                  Un jeu simple en apparence, mais d'une profondeur tactique infinie.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/game"
                  className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl font-bold text-lg shadow-lg transform hover:-translate-y-1 transition-all"
                >
                  Jouer maintenant
                </Link>
                <Link
                  to="/rules"
                  className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-lg border-2 border-gray-700 transition-all"
                >
                  Apprendre les règles
                </Link>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 sm:gap-8 justify-center lg:justify-start pt-4">
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-black text-amber-500">100%</div>
                  <div className="text-xs sm:text-sm text-gray-300 uppercase tracking-wider">Gratuit</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-black text-blue-500">4</div>
                  <div className="text-xs sm:text-sm text-gray-300 uppercase tracking-wider">Modes de jeu</div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-green-500">
                  ∞
                  <div className="text-xs sm:text-sm text-gray-300 uppercase tracking-wider font-normal">Parties</div>
                </div>
              </div>
            </div>

            {/* Right: Game Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800 transform hover:scale-105 transition-transform duration-300">
                <img
                  src="/akong.png"
                  alt="Plateau de jeu Akong"
                  className="w-full h-auto"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent"></div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-gray-800/50" aria-labelledby="features-title">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 id="features-title" className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">
              Pourquoi jouer à <span className="text-amber-500">Akông</span> ?
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Une expérience de jeu moderne pour un classique intemporel
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-900 p-6 sm:p-8 rounded-2xl border border-gray-800 hover:border-amber-500/50 transition-all transform hover:-translate-y-2 group"
              >
                <div className="text-amber-500 mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="py-16 sm:py-24" aria-labelledby="howtoplay-title">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 id="howtoplay-title" className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">
              Comment <span className="text-blue-500">jouer</span> ?
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Trois étapes simples pour maîtriser le jeu
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {rules.map((rule, index) => (
              <div key={index} className="relative">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition-all h-full">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-black">{rule.step}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-4 mt-4">{rule.title}</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {rule.description}
                  </p>
                </div>
                {index < rules.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2">
                    <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/rules"
              className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg transform hover:-translate-y-1 transition-all"
            >
              Voir toutes les règles
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-amber-900/20 to-blue-900/20" aria-labelledby="cta-title">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 id="cta-title" className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6">
            Prêt à relever le <span className="text-amber-500">défi</span> ?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Rejoignez les joueurs et découvrez la stratégie qui traverse les siècles.
          </p>
          <Link
            to="/game"
            className="inline-block px-12 py-5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl font-bold text-xl shadow-2xl transform hover:-translate-y-1 transition-all"
          >
            Commencer à jouer
          </Link>
        </div>
      </section>

    </main>
  );
};

export default LandingPage;
