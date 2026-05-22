import { Separator } from '../ui/separator';

const footerLinks = {
  Product: ['Features', 'Pricing', 'Case Studies', 'Updates'],
  Company: ['About', 'Blog', 'Careers', 'Press'],
  Resources: ['Documentation', 'Help Center', 'Community', 'Contact'],
  Legal: ['Terms', 'Privacy', 'Cookie Policy', 'Licenses'],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <div className="text-emerald-500 mb-4">RenovAlteGermany</div>
            <p className="text-sm text-gray-400">
              Your smart AI assistant for home renovation and financing in Germany.
            </p>
            <div className="flex gap-2 mt-4">
              <button className="px-3 py-1 text-xs border border-gray-700 rounded hover:bg-gray-800 transition-colors">
                EN
              </button>
              <button className="px-3 py-1 text-xs border border-gray-700 rounded hover:bg-gray-800 transition-colors">
                DE
              </button>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white mb-4 text-sm">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="/" onClick={(e) => e.preventDefault()} className="text-sm hover:text-emerald-400 transition-colors">
                    
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="bg-gray-800 mb-8" />

        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
          <p>© 2025 RenovAlteGermany. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="/" onClick={(e) => e.preventDefault()} className="hover:text-emerald-400 transition-colors">Twitter</a>
            <a href="/" onClick={(e) => e.preventDefault()} className="hover:text-emerald-400 transition-colors">LinkedIn</a>
            <a href="/" onClick={(e) => e.preventDefault()} className="hover:text-emerald-400 transition-colors">Facebook</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Twitter</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Facebook</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
