"use client"

import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  CheckCircle2,
  Factory,
  Briefcase,
  Zap,
  UserCheck,
  BarChart3,
  ArrowRight,
  TrendingUp,
  Award,
  Shield,
  Users,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* --- NAVBAR --- */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo width={140} />

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#solucoes" className="hover:text-primary transition-colors relative group">
              Soluções
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
            </Link>
            <Link href="#casos" className="hover:text-primary transition-colors relative group">
              Casos de Uso
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
            </Link>
            <Link href="#vagas" className="hover:text-primary transition-colors relative group">
              Vagas
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Login
            </Link>
            <Link href="/auth/quick-register">
              <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                Sou candidato
              </Button>
            </Link>
            <Link href="/auth/empresa">
              <Button size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                Sou empresa
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* --- HERO SECTION --- */}
        <section className="container mx-auto px-4 py-20 md:py-28 text-center relative overflow-hidden">
          {/* Background decoration */}
          {/* Updated hero background to use turquoise primary color */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#24BFB0]/5 rounded-full blur-3xl -z-10"></div>

          <div className="max-w-4xl mx-auto space-y-8">
            {/* Updated badge to use turquoise brand color */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#24BFB0]/10 text-[#03565C] text-sm font-semibold border border-[#24BFB0]/20 mb-4">
              <Zap className="w-4 h-4" />
              Reduza seu tempo de contratação em até 57%
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.05] text-balance">
              A plataforma de recrutamento para a {/* Updated gradient to use turquoise colors */}
              <span className="text-[#24BFB0] bg-gradient-to-r from-[#24BFB0] to-[#25D9B8] bg-clip-text text-transparent">
                indústria!
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed text-balance">
              ATS completo para todas as carreiras, além de acesso a uma base de talentos técnicos qualificada e
              altamente engajada.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Link href="/auth/quick-register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-lg h-14 px-10 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 group bg-[#03565C] hover:bg-[#024147]"
                >
                  Comece a contratar
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/quick-register">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg h-14 px-10 shadow-sm hover:shadow-md transition-shadow">
                  Ver vagas disponíveis
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Gratuito para começar</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Configuração em 5 minutos</span>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-20 border-t pt-12 max-w-5xl mx-auto">
            <p className="text-sm text-slate-500 font-semibold mb-8 uppercase tracking-wider flex items-center justify-center gap-2">
              <Award className="w-4 h-4" />A solução escolhida por empresas que levam o recrutamento a sério
            </p>
            <div className="flex flex-wrap justify-center gap-12 md:gap-16 items-center">
              <img
                src="/embraer.png"
                alt="Embraer"
                className="h-8 md:h-30 w-auto opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
              <img
                src="/Gerdau.png"
                alt="Gerdau"
                className="h-8 md:h-20 w-auto opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
              <img
                src="/Klabin.png"
                alt="Klabin"
                className="h-8 md:h-20 w-auto opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
              <img
                src="/suzano.png"
                alt="Suzano"
                className="h-8 md:h-15 w-auto opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
              <img
                src="/Toyota.png"
                alt="Toyota"
                className="h-8 md:h-10 w-auto opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
            </div>
          </div>
        </section>

        {/* --- PAIN SECTION --- */}
        {/* Updated section background to use dark teal brand color */}
        <section className="bg-gradient-to-br from-[#03565C] via-[#024850] to-[#03565C] text-white py-24 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            {/* Updated glow colors to turquoise */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#24BFB0] rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#25D9B8] rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                {/* Updated badge to use turquoise */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#24BFB0]/20 text-[#25D9B8] text-sm font-semibold border border-[#24BFB0]/30 backdrop-blur-sm">
                  <TrendingUp className="w-4 h-4" /> Eficiência Comprovada
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold leading-tight text-balance">
                  Entreviste menos e contrate mais
                </h2>
                <p className="text-slate-300 text-lg leading-relaxed">
                  Reduza drasticamente o tempo do seu processo seletivo. Conectamos sua empresa diretamente com
                  profissionais qualificados, disponíveis e alinhados com suas necessidades, eliminando etapas
                  desnecessárias.
                </p>
                <div className="flex flex-col gap-4 pt-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-white">Triagem automatizada</p>
                      <p className="text-sm text-slate-400">Perguntas personalizadas filtram candidatos ideais</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-white">Talentos pré-qualificados</p>
                      <p className="text-sm text-slate-400">Base exclusiva de profissionais verificados</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-white">Match inteligente</p>
                      <p className="text-sm text-slate-400">Algoritmo conecta empresa e candidato ideal</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Chart */}
              {/* Updated chart bar colors to dark teal and turquoise */}
              <div className="bg-[#024850]/50 p-10 rounded-3xl border border-[#03565C]/50 shadow-2xl backdrop-blur-sm">
                <h3 className="text-center mb-10 text-sm text-slate-300 font-semibold uppercase tracking-widest">
                  Tempo médio para contratação
                </h3>
                <div className="flex justify-center items-end gap-16 h-90">
                  {/* Market Standard Bar */}
                  <div className="flex flex-col items-center gap-4 w-28 group cursor-default">
                    <div className="relative">
                      <span className="text-3xl font-bold text-slate-400 group-hover:text-slate-300 transition-colors">
                        33 dias
                      </span>
                      <div className="absolute top-0 -right-14 bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full border border-red-500/30">
                        Lento
                      </div>
                    </div>
                    <div className="w-full bg-gradient-to-t from-slate-600 to-slate-500 rounded-t-xl h-72 relative overflow-hidden shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-700/50 to-transparent"></div>
                    </div>
                    <span className="text-xs text-slate-400 text-center font-medium">
                      Padrão de
                      <br />
                      mercado
                    </span>
                  </div>

                  {/* Platform Bar */}
                  <div className="flex flex-col items-center gap-4 w-28 group cursor-default">
                    <div className="relative">
                      {/* Updated text to turquoise */}
                      <span className="text-4xl font-bold text-[#25D9B8] group-hover:text-[#24BFB0] transition-colors">
                        14 dias
                      </span>
                      {/* Updated badge to turquoise */}
                      <div className="absolute -top-1 -right-10 bg-[#24BFB0]/20 text-[#25D9B8] text-xs px-2 py-1 rounded-full border border-[#24BFB0]/30 animate-pulse">
                        -57%
                      </div>
                    </div>
                    {/* Updated bar gradient to turquoise colors */}
                    <div className="w-full bg-gradient-to-t from-[#24BFB0] to-[#25D9B8] rounded-t-xl h-36 relative shadow-[0_0_30px_rgba(36,191,176,0.4)] animate-pulse">
                      <div className="absolute top-0 left-0 right-0 h-2 bg-[#25D9B8]/50 rounded-t-xl"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#03565C]/30 to-transparent"></div>
                    </div>
                    <span className="text-xs font-bold text-white text-center">
                      Nossa
                      <br />
                      Plataforma
                    </span>
                  </div>
                </div>
                <p className="text-center text-xs text-slate-500 mt-8">
                  Dados baseados em média de 500+ contratações realizadas
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- SPECIALTIES SECTION --- */}
        <section id="solucoes" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              {/* Updated badge to turquoise */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#24BFB0]/10 text-[#03565C] text-sm font-semibold border border-[#24BFB0]/20 mb-6">
                <Factory className="w-4 h-4" />
                Especialidades Verticais
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-balance">
                Os talentos que você precisa em um único lugar
              </h2>
              <p className="text-lg text-slate-600 text-balance">
                Especialidades adaptadas para a indústria: Papel e Celulose, Mecânica, Elétrica e muito mais.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {/* Industrial Side */}
              <div className="space-y-6 p-8 bg-gradient-to-br from-[#24BFB0]/5 to-[#25D9B8]/5 rounded-3xl border border-[#24BFB0]/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#24BFB0]/10 rounded-xl flex items-center justify-center">
                    <Factory className="w-6 h-6 text-[#24BFB0]" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Especialidades Industriais</h3>
                </div>
                <div className="grid gap-3">
                  {[
                    "Engenharia Mecânica",
                    "Elétrica e Automação",
                    "Papel e Celulose",
                    "Calderaria e Solda",
                    "Instrumentação",
                    "Manutenção Industrial",
                  ].map((item, idx) => (
                    <div
                      key={item}
                      className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-[#24BFB0] hover:shadow-md transition-all cursor-default group"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <span className="font-semibold text-slate-700 group-hover:text-[#24BFB0] transition-colors">
                        {item}
                      </span>
                      <CheckCircle2 className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Corporate Side */}
              <div className="space-y-6 p-8 bg-gradient-to-br from-[#03565C]/5 to-[#024850]/5 rounded-3xl border border-[#03565C]/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#03565C]/10 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-[#03565C]" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Especialidades Corporativas</h3>
                </div>
                <div className="grid gap-3">
                  {[
                    "Comercial",
                    "Marketing Industrial",
                    "Financeiro",
                    "Recursos Humanos",
                    "Supply Chain",
                    "Segurança do Trabalho",
                  ].map((item, idx) => (
                    <div
                      key={item}
                      className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-[#03565C]/30 hover:shadow-md transition-all cursor-default group"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <span className="font-semibold text-slate-700 group-hover:text-[#03565C] transition-colors">
                        {item}
                      </span>
                      <CheckCircle2 className="w-5 h-5 text-[#24BFB0] group-hover:scale-110 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- ECOSYSTEM SECTION --- */}
        <section id="casos" className="py-24 bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6">O ecossistema completo</h2>
              <p className="text-lg text-slate-600">
                Tudo que você precisa para contratar os melhores talentos da indústria
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Card 1 */}
              <div className="p-8 rounded-3xl bg-white border-2 border-slate-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
                {/* Updated icon background to turquoise gradient */}
                <div className="w-16 h-16 bg-gradient-to-br from-[#24BFB0] to-[#25D9B8] rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg">
                  <BarChart3 className="w-8 h-8" />
                </div>
                {/* Updated hover text to turquoise */}
                <h3 className="text-2xl font-bold mb-4 group-hover:text-[#24BFB0] transition-colors">
                  Software de Recrutamento
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Divulgue vagas, importe perfis, pré-qualifique candidatos com perguntas personalizadas e controle todo
                  o recrutamento em um só lugar.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>ATS completo integrado</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Triagem automatizada</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Dashboard analítico</span>
                  </li>
                </ul>
              </div>

              {/* Card 2 */}
              <div className="p-8 rounded-3xl bg-white border-2 border-slate-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
                {/* Updated icon background to dark teal gradient */}
                <div className="w-16 h-16 bg-gradient-to-br from-[#03565C] to-[#024850] rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg">
                  <UserCheck className="w-8 h-8" />
                </div>
                {/* Updated hover text to dark teal */}
                <h3 className="text-2xl font-bold mb-4 group-hover:text-[#03565C] transition-colors">
                  Serviço de Recrutamento
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Confie em nós para encontrar seu talento. Com nosso time especializado, atuamos nas principais etapas
                  de triagem e seleção.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Time dedicado de especialistas</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Busca ativa de talentos</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Entrevistas especializadas</span>
                  </li>
                </ul>
              </div>

              {/* Card 3 */}
              <div className="p-8 rounded-3xl bg-white border-2 border-slate-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
                {/* Updated icon background to accent turquoise */}
                <div className="w-16 h-16 bg-gradient-to-br from-[#25D9B8] to-[#24BFB0] rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg">
                  <Users className="w-8 h-8" />
                </div>
                {/* Updated hover text to turquoise */}
                <h3 className="text-2xl font-bold mb-4 group-hover:text-[#25D9B8] transition-colors">
                  Base de Talentos
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Os melhores talentos da indústria brasileira, todos pré-selecionados e prontos para novas
                  oportunidades em sua fábrica ou escritório.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Perfis verificados e validados</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Talentos ativamente procurando</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Match por especialidade</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* --- TESTIMONIALS --- */}
        <section className="py-24 bg-white border-y">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-semibold border border-green-200 mb-6">
                <Award className="w-4 h-4" />
                Depoimentos
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4">O que dizem nossos clientes?</h2>
              <p className="text-lg text-slate-600">Empresas reais, resultados reais</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-gradient-to-br from-white to-slate-50 p-10 rounded-3xl shadow-lg border-2 border-slate-100 relative hover:shadow-xl hover:-translate-y-1 transition-all">
                {/* Updated quote mark to turquoise */}
                <div className="text-7xl text-[#24BFB0]/20 absolute top-6 left-8 font-serif">"</div>
                <p className="text-slate-700 text-lg relative z-10 mb-8 pt-8 leading-relaxed">
                  Tive uma experiência ótima e eficiente. Em poucos dias, conseguimos fechar uma posição que estava em
                  aberto há algum tempo. O processo foi extremamente prático e objetivo.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 border-2 border-primary">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">LF</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900">Liliane Figueiredo</p>
                      <p className="text-sm text-slate-600">Gerente de Recrutamento e Seleção</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50 p-10 rounded-3xl shadow-lg border-2 border-slate-100 relative hover:shadow-xl hover:-translate-y-1 transition-all">
                {/* Updated quote mark to turquoise */}
                <div className="text-7xl text-[#24BFB0]/20 absolute top-6 left-8 font-serif">"</div>
                <p className="text-slate-700 text-lg relative z-10 mb-8 pt-8 leading-relaxed">
                  Avalio como excelente a experiência. A praticidade e rapidez na triagem e seleção dos candidatos mais
                  alinhados à empresa são grandes diferenciais.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 border-2 border-primary">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">MP</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900">Michelle Pelosini</p>
                      <p className="text-sm text-slate-600">Diretora de RH</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- OPEN VACANCIES --- */}
        <section id="vagas" className="py-24 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4">
              <div>
                <h2 className="text-4xl md:text-5xl font-extrabold mb-2">Vagas em destaque</h2>
                <p className="text-slate-600">Oportunidades atualizadas diariamente</p>
              </div>
              <Link href="/vagas">
                <Button variant="outline" size="lg" className="group bg-transparent">
                  Ver todas as vagas
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Vaga 1 */}
              {/* Updated hover border to turquoise */}
              <div className="border-2 border-slate-200 rounded-2xl p-6 bg-white hover:border-[#24BFB0] hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer group">
                <div className="flex justify-between items-start mb-5">
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    PRESENCIAL
                  </span>
                  <span className="text-slate-400 text-xs">Há 2 horas</span>
                </div>
                {/* Updated title hover to turquoise */}
                <h3 className="font-bold text-xl mb-2 group-hover:text-[#24BFB0] transition-colors">
                  Engenheiro Mecânico Pleno
                </h3>
                <p className="text-sm text-slate-500 mb-5 flex items-center gap-1">
                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                  São Paulo, SP
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full text-slate-700 font-medium">
                    SolidWorks
                  </span>
                  <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full text-slate-700 font-medium">
                    AutoCAD
                  </span>
                </div>
                <div className="flex items-center justify-between pt-5 border-t-2 border-slate-100">
                  <span className="text-base font-bold text-green-600">R$ 8.000 - 10.000</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#24BFB0] hover:text-[#24BFB0]/80 hover:bg-[#24BFB0]/10 font-semibold"
                  >
                    Ver vaga →
                  </Button>
                </div>
              </div>

              {/* Vaga 2 */}
              <div className="border-2 border-slate-200 rounded-2xl p-6 bg-white hover:border-[#24BFB0] hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer group">
                <div className="flex justify-between items-start mb-5">
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    HÍBRIDO
                  </span>
                  <span className="text-slate-400 text-xs">Há 5 horas</span>
                </div>
                <h3 className="font-bold text-xl mb-2 group-hover:text-[#24BFB0] transition-colors">
                  Técnico em Automação
                </h3>
                <p className="text-sm text-slate-500 mb-5 flex items-center gap-1">
                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                  Curitiba, PR
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full text-slate-700 font-medium">CLP</span>
                  <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full text-slate-700 font-medium">
                    Siemens
                  </span>
                </div>
                <div className="flex items-center justify-between pt-5 border-t-2 border-slate-100">
                  <span className="text-base font-bold text-green-600">R$ 4.500 - 6.000</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#24BFB0] hover:text-[#24BFB0]/80 hover:bg-[#24BFB0]/10 font-semibold"
                  >
                    Ver vaga →
                  </Button>
                </div>
              </div>

              {/* Vaga 3 */}
              <div className="border-2 border-slate-200 rounded-2xl p-6 bg-white hover:border-[#24BFB0] hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer group">
                <div className="flex justify-between items-start mb-5">
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    PRESENCIAL
                  </span>
                  <span className="text-slate-400 text-xs">Há 1 dia</span>
                </div>
                <h3 className="font-bold text-xl mb-2 group-hover:text-[#24BFB0] transition-colors">
                  Gerente de Manutenção
                </h3>
                <p className="text-sm text-slate-500 mb-5 flex items-center gap-1">
                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                  Sorocaba, SP
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full text-slate-700 font-medium">
                    Gestão
                  </span>
                  <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full text-slate-700 font-medium">SAP</span>
                </div>
                <div className="flex items-center justify-between pt-5 border-t-2 border-slate-100">
                  <span className="text-base font-bold text-green-600">R$ 15.000 - 18.000</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[#24BFB0] hover:text-[#24BFB0]/80 hover:bg-[#24BFB0]/10 font-semibold"
                  >
                    Ver vaga →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- CTA SECTION --- */}
        {/* Updated CTA section to use turquoise gradient */}
        <section className="py-24 bg-gradient-to-br from-[#24BFB0] to-[#25D9B8] text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-semibold border border-white/30 backdrop-blur-sm">
                <Shield className="w-4 h-4" />
                Comece gratuitamente hoje
              </div>
              <h2 className="text-4xl md:text-6xl font-extrabold leading-tight text-balance">
                Pronto para revolucionar seu recrutamento?
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed text-balance">
                Junte-se a centenas de empresas que já encontraram seus melhores talentos através da nossa plataforma.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href="/auth/quick-register">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full sm:w-auto text-lg h-14 px-10 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 group bg-white text-[#03565C] hover:bg-white/90"
                  >
                    Começar agora
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/auth/quick-register">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-lg h-14 px-10 border-2 border-white text-white hover:bg-white/10 bg-transparent"
                  >
                    Buscar vagas
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap justify-center gap-8 pt-6 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Configuração em minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Sem compromisso</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Suporte dedicado</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      {/* Updated footer to use dark teal background */}
      <footer className="border-t py-16 bg-[#03565C] text-slate-300">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <Logo width={120} />
              <p className="text-sm text-slate-400 leading-relaxed">
                A plataforma de recrutamento especializada para a indústria brasileira.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Produto</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="#solucoes" className="hover:text-white transition-colors">
                    Soluções
                  </Link>
                </li>
                <li>
                  <Link href="#casos" className="hover:text-white transition-colors">
                    Casos de Uso
                  </Link>
                </li>
                <li>
                  <Link href="#vagas" className="hover:text-white transition-colors">
                    Vagas
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Empresa</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/admin/vagas" className="hover:text-white transition-colors">
                    Admin Vagas
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Login
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/politica" className="hover:text-white transition-colors">
                    Política de Privacidade
                  </Link>
                </li>
                <li>
                  <Link href="/termos" className="hover:text-white transition-colors">
                    Termos de Uso
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
            <p>© {new Date().getFullYear()} Plataforma Industrial. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
