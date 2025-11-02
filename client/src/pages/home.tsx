import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Headset, User, Bolt, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";

export default function Home() {
  const [showTechLogin, setShowTechLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const handleTechLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({
        title: "Campos Incompletos",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setShowLoadingModal(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const user = await response.json();
        localStorage.setItem("technician", JSON.stringify(user));

        if (user.role === "admin") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/technician";
        }
      } else {
        const error = await response.json();
        toast({
          title: "Erro de Login",
          description: error.error || "Usuário ou senha inválidos",
          variant: "destructive",
        });
        setShowLoadingModal(false);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive",
      });
      setShowLoadingModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      {/* Botão de alternar tema */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-4 right-4"
        onClick={toggleTheme}
        data-testid="button-theme-toggle"
      >
        {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </Button>

      <Card className="max-w-md w-full mx-4">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="mb-4">
              <img 
                src="/images/logo-doctum.png" 
                alt="Rede de Ensino Doctum" 
                className="h-24 mx-auto object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Help Doctum</h1>
            <p className="text-muted-foreground">Selecione como deseja acessar o sistema</p>
          </div>

          <div className="space-y-4">
            <Link href="/user">
              <Button 
                className="w-full py-6 text-lg" 
                data-testid="button-user-access"
              >
                <User className="mr-2 h-5 w-5" />
                Entrar como Usuário
              </Button>
            </Link>

            <Button 
              variant="secondary" 
              className="w-full py-6 text-lg" 
              onClick={() => setShowTechLogin(true)}
              data-testid="button-tech-access"
            >
              <Bolt className="mr-2 h-5 w-5" />
              Acesso Técnico/Administrador
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showTechLogin} onOpenChange={setShowTechLogin}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login Técnico/Administrador</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleTechLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                data-testid="input-password"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={isLoading}
                data-testid="button-login-submit"
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                className="flex-1"
                onClick={() => setShowTechLogin(false)}
                data-testid="button-login-cancel"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showLoadingModal} onOpenChange={setShowLoadingModal}>
        <DialogContent className="sm:max-w-md flex items-center justify-center">
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4">
            <svg className="animate-spin h-8 w-8 text-primary mb-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 4v4l2-2 2 2 2-2 2 2 2-2 2 2-2-2 2-2 2-2-2 2-2-2-2-2-2 2-2-2-2-4zm8 12l-2 2 2 2 2-2-2-2zm-8 4l-2 2 2 2 2-2-2-2zm-8-4l-2 2 2 2 2-2-2-2z"/>
            </svg>
            <p className="text-muted-foreground">Aguarde enquanto processamos seu login.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}