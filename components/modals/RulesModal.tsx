import React from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-600 relative">
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-amber-500">Règles du Songo (MPEM)</h2>
          <button onClick={onClose} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600">✕</button>
        </div>
        <div className="p-6 text-gray-300 space-y-4 leading-relaxed">
          <section>
            <h3 className="text-lg font-bold text-white mb-2">But du jeu</h3>
            <p>Capturer plus de 35 graines (ou avoir plus de 35 points en fin de partie).</p>
          </section>
          <section>
            <h3 className="text-lg font-bold text-white mb-2">Distribution</h3>
            <p>On sème les graines une par une vers la droite (sens anti-horaire). Si on a plus de 14 graines, on fait un tour complet en sautant la case de départ.</p>
          </section>
          <section>
            <h3 className="text-lg font-bold text-white mb-2">La Prise</h3>
            <p>Si la dernière graine tombe chez l'adversaire et que la case contient alors 2, 3 ou 4 graines, on capture ces graines (ainsi que celles des cases précédentes si elles remplissent la même condition).</p>
          </section>
          <section>
            <h3 className="text-lg font-bold text-white mb-2">Règles Spéciales</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Auto-capture :</strong> Si un tour complet se termine avec 1 graine restante (ex: 14, 28...), elle est capturée automatiquement.</li>
              <li><strong>Solidarité (Le Un) :</strong> Si vous n'avez plus qu'une seule graine <em>et qu'elle est dans votre dernière case</em>, vous l'auto-capturez. L'adversaire DOIT alors jouer un coup qui vous redonne des graines (si possible).</li>
              <li><strong>Interdiction d'assécher :</strong> On ne peut pas capturer toutes les graines de l'adversaire d'un seul coup si cela le prive de tout mouvement au tour suivant (sauf s'il n'y a pas d'autre choix).</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
