"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { EnvelopeIcon, PhoneIcon, MapPinIcon, AtSymbolIcon, AtSymbolIcon, AtSymbolIcon, AtSymbolIcon, HeartIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface FooterProps {
  className?: string;
}

export default function Footer({ className = "" }: FooterProps) {
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6, 
        ease: "easeOut" as const
      }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const productLinks = [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Voice Coaching', href: '/agents' },
    { name: 'AI Coaches', href: '/coaches' },
    { name: 'Progress Analytics', href: '/analytics' },
    { name: 'Integrations', href: '/integrations' }
  ];

  const companyLinks = [
    { name: 'About Us', href: '/about' },
    { name: 'Our Team', href: '/team' },
    { name: 'Careers', href: '/careers' },
    { name: 'Press Kit', href: '/press' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' }
  ];

  const resourcesLinks = [
    { name: 'Documentation', href: '/docs' },
    { name: 'Help Center', href: '/help' },
    { name: 'Community', href: '/community' },
    { name: 'API Reference', href: '/api' },
    { name: 'Coaching Tips', href: '/tips' },
    { name: 'Success Stories', href: '/stories' }
  ];

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
    { name: 'Security', href: '/security' },
    { name: 'GDPR', href: '/gdpr' },
    { name: 'Accessibility', href: '/accessibility' }
  ];

  const socialLinks = [
    { name: 'Twitter', href: 'https://twitter.com/liveguide', icon: Twitter },
    { name: 'LinkedIn', href: 'https://linkedin.com/company/liveguide', icon: Linkedin },
    { name: 'Facebook', href: 'https://facebook.com/liveguide', icon: Facebook },
    { name: 'Instagram', href: 'https://instagram.com/liveguide', icon: Instagram }
  ];

  return (
    <footer className={`relative bg-slate-950 border-t border-slate-800 ${className}`}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] via-blue-500/[0.02] to-indigo-500/[0.03]"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            backgroundSize: '400% 400%'
          }}
        />
      </div>

      <motion.div 
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Company Info */}
          <motion.div variants={fadeInUp} className="lg:col-span-2">
            <Link href="/" className="flex items-center mb-6">
              <Image 
                src="/liveguide-logo.png" 
                alt="LiveGuide" 
                width={160} 
                height={45} 
                className="h-10 w-auto"
                priority
              />
            </Link>
            <p className="text-slate-400 leading-relaxed mb-6 max-w-md">
              Transform your potential with AI-powered coaching that adapts to your unique journey. 
              Experience personalized growth through advanced conversational AI technology.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-slate-400">
                <EnvelopeIcon  className="w-4 h-4" />
                <a href="mailto:hello@liveguide.ai" className="hover:text-white transition-colors">
                  hello@liveguide.ai
                </a>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <PhoneIcon  className="w-4 h-4" />
                <a href="tel:+1-555-0123" className="hover:text-white transition-colors">
                  +1 (555) 012-3456
                </a>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <MapPinIcon  className="w-4 h-4" />
                <span>San Francisco, CA</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <social.icon className="w-4 h-4" />
                  <span className="sr-only">{social.name}</span>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Product Links */}
          <motion.div variants={fadeInUp}>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group"
                  >
                    {link.name}
                    {link.href.startsWith('http') && (
                      <ArrowTopRightOnSquareIcon  className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Company Links */}
          <motion.div variants={fadeInUp}>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group"
                  >
                    {link.name}
                    {link.href.startsWith('http') && (
                      <ArrowTopRightOnSquareIcon  className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Resources Links */}
          <motion.div variants={fadeInUp}>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              {resourcesLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group"
                  >
                    {link.name}
                    {link.href.startsWith('http') && (
                      <ArrowTopRightOnSquareIcon  className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Newsletter Signup */}
        <motion.div 
          variants={fadeInUp}
          className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20 p-6 mb-12"
        >
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-semibold text-white mb-2">
              Stay Updated with LiveGuide
            </h3>
            <p className="text-slate-400 mb-6">
              Get the latest insights on AI coaching, personal development tips, and product updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <motion.button
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Subscribe
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div 
          variants={fadeInUp}
          className="border-t border-slate-800 pt-8"
        >
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="flex items-center gap-2 text-slate-400">
              <span>© 2024 LiveGuide AI. Made with</span>
              <HeartIcon  className="w-4 h-4 text-red-400 fill-current" />
              <span>in San Francisco</span>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap items-center gap-6">
              {legalLinks.map((link) => (
                <Link 
                  key={link.name}
                  href={link.href}
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
}