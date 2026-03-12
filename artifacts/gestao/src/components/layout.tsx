import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  SidebarProvider, 
  SidebarTrigger, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Package, 
  Folder, 
  Tags, 
  ShoppingCart, 
  Users, 
  UserCog, 
  LogOut,
  Loader2
} from "lucide-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Produtos", href: "/produtos", icon: Package },
  { name: "Categorias", href: "/categorias", icon: Folder },
  { name: "Etiquetas", href: "/etiquetas", icon: Tags },
  { name: "Vendas", href: "/vendas", icon: ShoppingCart },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Usuários", href: "/usuarios", icon: UserCog },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useGetMe({
    query: {
      retry: false,
    }
  });

  const { mutate: logout, isPending: isLoggingOut } = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData(getGetMeQueryKey(), null);
        setLocation("/login");
      }
    }
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        <Sidebar className="border-r border-border/50 bg-card">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <img 
                  src={`${import.meta.env.BASE_URL}images/logo-icon.png`} 
                  alt="GestãoPro" 
                  className="w-5 h-5 object-contain"
                />
              </div>
              <h1 className="text-xl font-display font-bold text-gradient">GestãoPro</h1>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => {
                    const isActive = location.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive}
                          className={`
                            h-11 px-4 mb-1 rounded-xl transition-all duration-200
                            ${isActive 
                              ? "bg-primary/10 text-primary hover:bg-primary/15 font-medium" 
                              : "text-muted-foreground hover:bg-white/5 hover:text-foreground hover-elevate"
                            }
                          `}
                        >
                          <Link href={item.href} className="flex items-center gap-3">
                            <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                            <span className="text-sm">{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-border/50">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">{user.name}</span>
                <span className="text-xs text-muted-foreground mt-1 capitalize">{user.role}</span>
              </div>
            </div>
            <button 
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-4 h-10 text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-colors font-medium hover-elevate disabled:opacity-50"
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>Sair do sistema</span>
            </button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="h-16 flex items-center px-6 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="hover-elevate mr-4" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
