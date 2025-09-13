import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { AuthContext, useAuth } from "@/context/auth";
import Home from "@/pages/home";
import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";


function Router() {
  const { user } = useAuth();

  if (user) {
    return (
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth" component={Home} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Auth} />
      <Route path="/auth" component={Auth} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthContext.Provider value={{ user, setUser }}>
          <Toaster />
          <Router />
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
