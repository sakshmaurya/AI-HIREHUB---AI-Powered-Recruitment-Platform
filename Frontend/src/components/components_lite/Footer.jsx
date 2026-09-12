
import React from "react";
import { Link } from "react-router-dom";
import { Github, Heart, Mail, ArrowUpRight } from "lucide-react";

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10 lg:px-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          
          {/* Brand */}
          <div>
            <Link
              to="/"
              onClick={scrollToTop}
              className="inline-block text-2xl font-bold tracking-tight text-gray-900"
            >
              AI<span className="text-[#FA4F09]">-HireHub</span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-500">
              Find the right opportunities, discover great talent, and build
              your career with AI-HireHub.
            </p>

            <a
              href="https://github.com/sakshmaurya"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-[#FA4F09]"
            >
              <Github size={18} />
              GitHub
              <ArrowUpRight size={14} />
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Quick Links
            </h3>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/"
                onClick={scrollToTop}
                className="w-fit text-sm text-gray-500 transition-colors hover:text-[#FA4F09]"
              >
                Home
              </Link>

              <Link
                to="/Browse"
                onClick={scrollToTop}
                className="w-fit text-sm text-gray-500 transition-colors hover:text-[#FA4F09]"
              >
                Browse Jobs
              </Link>

              <Link
                to="/Jobs"
                onClick={scrollToTop}
                className="w-fit text-sm text-gray-500 transition-colors hover:text-[#FA4F09]"
              >
                Jobs
              </Link>

              <Link
                to="/saved-jobs"
                onClick={scrollToTop}
                className="w-fit text-sm text-gray-500 transition-colors hover:text-[#FA4F09]"
              >
                Saved Jobs
              </Link>
            </div>
          </div>

          {/* Legal / Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Information
            </h3>

            <div className="mt-4 flex flex-col gap-3">
              <Link
                to="/PrivacyPolicy"
                onClick={scrollToTop}
                className="w-fit text-sm text-gray-500 transition-colors hover:text-[#FA4F09]"
              >
                Privacy Policy
              </Link>

              <Link
                to="/TermsofService"
                onClick={scrollToTop}
                className="w-fit text-sm text-gray-500 transition-colors hover:text-[#FA4F09]"
              >
                Terms of Service
              </Link>

              <a
                href="mailto:support@ai-hirehub.com"
                className="inline-flex w-fit items-center gap-2 text-sm text-gray-500 transition-colors hover:text-[#FA4F09]"
              >
                <Mail size={16} />
                Contact Support
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col gap-4 border-t border-gray-200 pt-6 text-sm md:flex-row md:items-center md:justify-between">
          <p className="text-gray-500">
            © 2026 AI-HireHub. All rights reserved.
          </p>

          <p className="flex items-center gap-1 text-gray-500">
            Made with
            <Heart
              size={15}
              className="fill-[#FA4F09] text-[#FA4F09]"
            />
            by{" "}
            <span className="font-medium text-gray-700">
              Satyam Maurya
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

