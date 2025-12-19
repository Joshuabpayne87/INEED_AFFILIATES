import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Users, TrendingUp, Shield, Sparkles, Crown } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function Landing() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      <nav className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/ina_light copy.png" alt="ineedaffiliates.com" className="h-10" />
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-gray-900 hover:text-primary font-medium transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link to="/signup">
              <Button variant="gradient" size="md">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-40 pb-12 px-6 bg-white overflow-hidden">
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-5xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 bg-gray-50 px-6 py-2.5 rounded-full border border-gray-200 mb-8 hover:bg-gray-100 transition-all duration-300">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm font-heading font-medium text-gray-700 tracking-wide">
                The Premier Platform for High-Ticket Partnerships
              </span>
            </div>

            <h1 className="text-6xl md:text-7xl lg:text-[100px] font-heading font-extrabold mb-8 leading-[1.1] tracking-tight">
              <span className="text-gray-900">Your Next</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-cyan bg-clip-text text-transparent">
                Revenue Explosion
              </span>
              <br />
              <span className="text-gray-900">Is One Partnership Away</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto font-light">
              Connect with high-ticket service providers and SaaS companies
              that are ready to drive revenue and scale with you today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link to="/signup">
                <Button
                  variant="gradient"
                  size="lg"
                  className="text-lg px-10 py-5 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  Start Building Partnerships
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            <p className="text-sm text-gray-600 font-medium tracking-wide">
              Join an exclusive network of 6, 7, & 8-figure entrepreneurs
            </p>
          </div>
        </div>
      </section>

      <section className="relative py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { label: 'Active Partnerships', value: '2,500+' },
              { label: 'Combined Revenue', value: '$180M+' },
              { label: 'Avg Deal Size', value: '$15K' },
              { label: 'Success Rate', value: '94%' },
            ].map((stat, i) => (
              <div
                key={i}
                className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all duration-500 group hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-cyan/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="text-4xl font-heading font-bold bg-gradient-to-r from-primary to-cyan bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative pt-24 pb-16 px-6 bg-gradient-to-b from-white via-gray-50/30 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-heading font-bold text-gray-900 mb-6 tracking-tight">
              Built for Elite Partnership Growth
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
              Everything you need to discover, connect, and collaborate with premium partners
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Exclusive Network',
                description: 'Access vetted high-ticket businesses ready for strategic partnerships',
                gradient: 'from-primary to-primary-600',
              },
              {
                icon: Zap,
                title: 'Automated Workflows',
                description: 'Smart CRM and follow-up system that nurtures relationships automatically',
                gradient: 'from-cyan to-cyan-600',
              },
              {
                icon: TrendingUp,
                title: 'Revenue Acceleration',
                description: 'Proven systems that close high-value deals and scale partnerships',
                gradient: 'from-navy to-navy-600',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative bg-white rounded-3xl p-10 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-cyan/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed font-light">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-32 px-6 bg-gradient-to-br from-gray-900 via-navy to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-[600px] h-[600px] bg-cyan rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
          <div className="absolute bottom-20 left-20 w-[600px] h-[600px] bg-primary rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        </div>

        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, white 1px, transparent 1px),
              linear-gradient(to bottom, white 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan/20 rounded-2xl mb-8">
              <Sparkles className="w-8 h-8 text-cyan" />
            </div>
            <h2 className="text-5xl md:text-6xl font-heading font-bold mb-6 tracking-tight">
              The Complete Partnership OS
            </h2>
            <p className="text-xl text-cyan-100/80 max-w-2xl mx-auto font-light">
              Everything in one premium platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'Partnership Directory', desc: 'Discover qualified partners instantly' },
              { icon: TrendingUp, title: 'Offer Marketplace', desc: 'Browse high-ticket opportunities' },
              { icon: Sparkles, title: 'Personal Offer Vault', desc: 'Track offers you promote' },
              { icon: Shield, title: 'Partner CRM', desc: 'Visual pipeline & relationship management' },
              { icon: Zap, title: 'Smart Follow-Ups', desc: 'Automated task & reminder system' },
              { icon: Crown, title: 'Elite Network', desc: 'Connect with 6, 7, & 8-figure businesses' },
            ].map((item, i) => (
              <div
                key={i}
                className="relative bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10 hover:bg-white/10 transition-all duration-500 group hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 to-primary/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <item.icon className="w-10 h-10 text-cyan mb-5 group-hover:scale-110 transition-transform duration-500" />
                  <h3 className="text-xl font-heading font-bold mb-3">{item.title}</h3>
                  <p className="text-cyan-100/70 text-sm font-light leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-32 px-6 bg-gradient-to-b from-white via-gray-50/30 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-heading font-bold text-gray-900 mb-8 tracking-tight">
            Ready to Scale Your Revenue?
          </h2>
          <p className="text-xl text-gray-600 mb-12 font-light leading-relaxed">
            Join the exclusive network of high-ticket entrepreneurs building million-dollar partnerships
          </p>

          <Link to="/signup">
            <Button
              variant="gradient"
              size="lg"
              className="text-lg px-12 py-6 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300"
            >
              Get Exclusive Access Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-10 text-sm text-gray-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">Instant Access</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">Premium Support</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative bg-gradient-to-br from-gray-900 via-navy to-gray-900 text-white py-16 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <img src="/white.png" alt="ineedaffiliates.com" className="h-12 mx-auto mb-6" />
          <p className="text-cyan-100/80 mb-6 font-light">
            The Premier Platform for High-Ticket Partnerships
          </p>
          <p className="text-sm text-gray-500">
            © 2025 ineedaffiliates.com. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
