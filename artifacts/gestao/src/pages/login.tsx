import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: login, isPending } = useLogin({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetMeQueryKey(), (data as any).user ?? data);
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

  const submitLogin = () => {
    login({ data: { login: identifier, password } });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitLogin();
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground relative overflow-hidden">
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
            <div className="w-12 h-12 rounded-xl flex items-center justify-center">
              <img 
                src={`${import.meta.env.BASE_URL}images/logo-icon.png`} 
                alt="Uaus" 
                className="w-12 h-12 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold leading-tight">Painel Administrativo</h1>
              <p className="text-xs text-muted-foreground">uaus.com.br</p>
            </div>
          </div>

          <h2 className="text-3xl font-display font-bold mb-2">Bem-vindo de volta</h2>
          <p className="text-muted-foreground mb-8 text-sm">
            Insira suas credenciais para acessar o painel.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email ou usuário</Label>
              <Input 
                id="identifier" 
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin ou admin@uaus.com.br" 
                className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary/50"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitLogin();
                  }
                }}
                placeholder="••••••••" 
                className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary/50"
                autoComplete="current-password"
                required
              />
              <div className="flex justify-end">
                <a href="#" tabIndex={-1} className="text-xs text-primary hover:text-primary/80 transition-colors">Esqueceu a senha?</a>
              </div>
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

          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Uaus — uaus.com.br
          </p>
        </motion.div>
      </div>
    </div>
  );
}
