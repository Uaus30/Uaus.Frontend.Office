import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { mutate: login, isPending } = useLogin({
    mutation: {
      onSuccess: () => {
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({
          title: "Erro ao entrar",
          description: err?.message || "Credenciais inválidas. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ data: { email, password } });
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground relative overflow-hidden">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/login-bg.png`} 
          alt="Login background" 
          className="w-full h-full object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent md:w-1/2 w-full" />
      </div>

      <div className="w-full max-w-md m-auto px-6 md:px-12 relative z-10 md:ml-[10%]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-panel p-8 md:p-12 rounded-3xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-inner">
              <img 
                src={`${import.meta.env.BASE_URL}images/logo-icon.png`} 
                alt="GestãoPro" 
                className="w-6 h-6 object-contain"
              />
            </div>
            <h1 className="text-2xl font-display font-bold text-gradient">GestãoPro</h1>
          </div>

          <h2 className="text-3xl font-display font-bold mb-2">Bem-vindo de volta</h2>
          <p className="text-muted-foreground mb-8 text-sm">
            Insira suas credenciais para acessar o painel administrativo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com" 
                className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary/50"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">Esqueceu a senha?</a>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary/50"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20 hover-elevate mt-4"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  Entrar no sistema <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
