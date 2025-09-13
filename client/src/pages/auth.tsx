import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema, loginSchema } from "@shared/schema";
import { z } from "zod";

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { setUser } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      avatar: "",
      status: "online",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      const { confirmPassword, ...registerData } = data;
      const response = await apiRequest("POST", "/api/auth/register", registerData);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      toast({
        title: "Welcome!",
        description: "Account created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            P2P Discord
          </CardTitle>
          <p className="text-muted-foreground">
            {isLogin ? "Welcome back!" : "Create your account"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLogin ? (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  {...loginForm.register("username")}
                  placeholder="Enter your username"
                />
                {loginForm.formState.errors.username && (
                  <p className="text-sm text-destructive mt-1">
                    {loginForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  data-testid="input-password"
                  {...loginForm.register("password")}
                  placeholder="Enter your password"
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                data-testid="button-login"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="reg-username">Username</Label>
                <Input
                  id="reg-username"
                  data-testid="input-register-username"
                  {...registerForm.register("username")}
                  placeholder="Choose a username"
                />
                {registerForm.formState.errors.username && (
                  <p className="text-sm text-destructive mt-1">
                    {registerForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-email"
                  {...registerForm.register("email")}
                  placeholder="Enter your email"
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  data-testid="input-register-password"
                  {...registerForm.register("password")}
                  placeholder="Choose a password"
                />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  data-testid="input-confirm-password"
                  {...registerForm.register("confirmPassword")}
                  placeholder="Confirm your password"
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive mt-1">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                data-testid="button-register"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating account..." : "Register"}
              </Button>
            </form>
          )}

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              data-testid="button-switch-auth"
            >
              {isLogin ? "Need an account? Register" : "Have an account? Login"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
