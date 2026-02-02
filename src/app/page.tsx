"use client";

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Camera, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
            <span className="font-semibold text-lg text-gray-900">PosePerfect</span>
          </div>
          <Link href="/studio">
            <Button className="bg-rose-500 hover:bg-rose-600 text-white rounded-full">
              Open App
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Capture Your Perfect <span className="text-rose-500">Pose</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Match your pose with our intelligent guide. Whether solo or with your loved one, create stunning photos that tell your story.
            </p>
            <div className="flex gap-4 mb-12">
              <Link href="/studio">
                <Button className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-6 rounded-full text-lg font-semibold flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Start Creating
                </Button>
              </Link>
              <Button variant="outline" className="border-2 border-gray-300 px-8 py-6 rounded-full text-lg font-semibold hover:border-rose-500 hover:text-rose-500">
                Learn More
              </Button>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-rose-500" />
                </div>
                <span className="text-gray-700">Solo & Couple Poses</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-rose-500" />
                </div>
                <span className="text-gray-700">AI-Powered Pose Matching</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-rose-500" />
                </div>
                <span className="text-gray-700">One-Tap Photo Capture</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-96 md:h-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-rose-200 to-pink-200 rounded-3xl blur-2xl opacity-30" />
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-rose-100 h-full flex items-center justify-center">
              <div className="text-center">
                <Heart className="h-24 w-24 text-rose-300 fill-rose-300 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-400 font-medium">Beautiful pose matching</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Why Choose PosePerfect?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Camera className="h-8 w-8 text-rose-500" />,
                title: "Smart Guidance",
                desc: "Real-time pose overlays guide you to the perfect position"
              },
              {
                icon: <Heart className="h-8 w-8 text-rose-500 fill-rose-500" />,
                title: "Romantic Poses",
                desc: "Beautiful couple poses designed for memorable moments"
              },
              {
                icon: <Sparkles className="h-8 w-8 text-rose-500" />,
                title: "Instant Feedback",
                desc: "Know exactly when your pose matches perfectly"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 hover:border-rose-500 transition-colors"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center bg-gradient-to-r from-rose-500 to-pink-500 rounded-3xl p-12 text-white shadow-xl"
        >
          <h2 className="text-4xl font-bold mb-4">Ready to Create Your Perfect Moment?</h2>
          <p className="text-lg mb-8 text-white/90">Start capturing stunning poses in seconds with AI-powered guidance.</p>
          <Link href="/studio">
            <Button className="bg-white text-rose-500 hover:bg-gray-100 px-8 py-6 rounded-full text-lg font-semibold flex items-center gap-2 mx-auto">
              Open PosePerfect
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rose-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center text-gray-600">
          <p>&copy; 2026 PosePerfect. Create beautiful moments together.</p>
        </div>
      </footer>
    </main>
  );
}
