import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  onShowProfile?: () => void;
  showFooter?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  isAuthenticated,
  onShowProfile,
  showFooter = true,
}) => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar isAuthenticated={isAuthenticated} onShowProfile={onShowProfile} />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;
