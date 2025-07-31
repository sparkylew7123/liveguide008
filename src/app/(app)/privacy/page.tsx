import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-8 text-white hover:text-blue-300">
            <ArrowLeftIcon  className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 md:p-12 text-white">
          <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Privacy Policy
          </h1>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <p className="text-gray-300 text-sm mb-6">
                Effective Date: January 25, 2025<br />
                Last Updated: January 25, 2025
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-300">1. Introduction</h2>
              <p className="text-gray-200 leading-relaxed">
                Welcome to LiveGuide AI ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered voice coaching platform at liveguide.ai (the "Service").
              </p>
              <p className="text-gray-200 leading-relaxed mt-4">
                By using our Service, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-300">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium mb-3 text-purple-300">2.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-200">
                <li><strong>Account Information:</strong> Name, email address, phone number (if using phone authentication), and password when you create an account.</li>
                <li><strong>Profile Information:</strong> Your preferred name for coaching sessions and voice preferences.</li>
                <li><strong>Goals and Preferences:</strong> Personal development goals, areas of focus, and coaching preferences you share during onboarding or sessions.</li>
                <li><strong>Voice Data:</strong> Audio recordings and transcriptions from your coaching sessions.</li>
                <li><strong>Feedback:</strong> Any feedback, ratings, or reviews you provide about coaches or sessions.</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6 text-purple-300">2.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-200">
                <li><strong>Usage Data:</strong> Session duration, frequency of use, features accessed, and interaction patterns.</li>
                <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers.</li>
                <li><strong>Log Data:</strong> IP address, access times, and pages viewed.</li>
                <li><strong>Cookies and Local Storage:</strong> We use cookies and local storage to maintain your session and preferences.</li>
              </ul>

              <h3 className="text-xl font-medium mb-3 mt-6 text-purple-300">2.3 Anonymous Usage</h3>
              <p className="text-gray-200 leading-relaxed">
                We support anonymous usage for privacy-conscious users. Anonymous sessions may have limited functionality but allow you to experience our coaching without creating an account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-300">3. How We Use Your Information</h2>
              <p className="text-gray-200 leading-relaxed mb-4">We use the collected information for:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-200">
                <li>Providing personalized AI coaching sessions</li>
                <li>Matching you with appropriate AI coaches based on your goals</li>
                <li>Improving our coaching algorithms and service quality</li>
                <li>Processing voice inputs and generating appropriate responses</li>
                <li>Maintaining your coaching history and progress tracking</li>
                <li>Sending service-related communications</li>
                <li>Ensuring platform security and preventing fraud</li>
                <li>Complying with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-300">4. Third-Party Services</h2>
              <p className="text-gray-200 leading-relaxed mb-4">We integrate with trusted third-party services to provide our Service:</p>
              
              <div className="bg-white/5 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-purple-300">Supabase</h4>
                  <p className="text-gray-300 text-sm">Database hosting, authentication, and real-time features. <Link href="https://supabase.com/privacy" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</Link></p>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-300">ElevenLabs</h4>
                  <p className="text-gray-300 text-sm">Voice synthesis and conversation processing. <Link href="https://elevenlabs.io/privacy" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</Link></p>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-300">OpenAI</h4>
                  <p className="text-gray-300 text-sm">Knowledge base embeddings and RAG functionality. <Link href="https://openai.com/privacy" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</Link></p>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-300">Cloudflare Turnstile</h4>
                  <p className="text-gray-300 text-sm">CAPTCHA services for security. <Link href="https://www.cloudflare.com/privacypolicy/" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</Link></p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-300">5. Data Storage and Security</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-200">
                <li>Your data is stored securely using industry-standard encryption</li>
                <li>We implement appropriate technical and organizational measures to protect your data</li>
                <li>Voice recordings are processed in real-time and stored only as necessary for service functionality</li>
                <li>We regularly review and update our security practices</li>
                <li>Access to personal data is restricted to authorized personnel only</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-300">6. Your Rights and Choices</h2>
              <p className="text-gray-200 leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-200">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong>Portability:</strong> Receive your data in a structured, commonly used format</li>
                <li><strong>Opt-out:</strong> Opt-out of marketing communications</li>
                <li><strong>Restrict Processing:</strong> Request that we limit the processing of your data</li>
              </ul>
              <p className="text-gray-200 leading-relaxed mt-4">
                To exercise these rights, please contact us at privacy@liveguide.ai.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-300">7. Data Retention</h2>
              <p className="text-gray-200 leading-relaxed">
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. When you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required for legal or legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-300">8. Children's Privacy</h2>
              <p className="text-gray-200 leading-relaxed">
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-300">9. International Data Transfers</h2>
              <p className="text-gray-200 leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws different from your country. We ensure appropriate safeguards are in place to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-300">10. Changes to This Privacy Policy</h2>
              <p className="text-gray-200 leading-relaxed">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-300">11. Contact Us</h2>
              <p className="text-gray-200 leading-relaxed">
                If you have questions or concerns about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="bg-white/5 rounded-lg p-6 mt-4">
                <p className="text-gray-200">
                  <strong>LiveGuide AI</strong><br />
                  Email: privacy@liveguide.ai<br />
                  Website: <Link href="https://liveguide.ai" className="text-blue-400 hover:underline">liveguide.ai</Link>
                </p>
              </div>
            </section>

            <section className="border-t border-gray-700 pt-8 mt-12">
              <p className="text-gray-400 text-sm text-center">
                By using LiveGuide AI, you acknowledge that you have read and understood this Privacy Policy.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}