
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GanttChartSquare } from 'lucide-react';
import { SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { useAuth } from '@/firebase/provider';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ['confirmPassword'],
});

type LoginSchema = z.infer<typeof loginSchema>;
type SignupSchema = z.infer<typeof signupSchema>;

export function AuthForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const loginForm = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onLoginSubmit = async (data: LoginSchema) => {
    if (!auth) return;
    setIsPending(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: 'Login Successful', description: "You've been successfully logged in." });
      onSuccess?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
    } finally {
      setIsPending(false);
    }
  };

  const onSignupSubmit = async (data: SignupSchema) => {
    if (!auth) return;
    setIsPending(true);
    try {
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: 'Signup Successful', description: "Your account has been created." });
      onSuccess?.();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Signup Failed', description: error.message });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>
            <div className="flex items-center gap-3">
                <GanttChartSquare className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-headline">
                Plantastic
                </h1>
            </div>
        </SheetTitle>
        <SheetDescription className="sr-only">
          Log in to or sign up for a new account.
        </SheetDescription>
      </SheetHeader>
      <ScrollArea>
        <div className="p-6">
            <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4 mt-4">
                    <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="m@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="pt-4">
                        <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? 'Logging in...' : 'Login'}
                        </Button>
                    </div>
                </form>
                </Form>
            </TabsContent>
            <TabsContent value="signup">
                <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4 mt-4">
                    <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="m@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="pt-4">
                        <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? 'Signing up...' : 'Sign Up'}
                        </Button>
                    </div>
                </form>
                </Form>
            </TabsContent>
            </Tabs>
        </div>
      </ScrollArea>
    </>
  );
}
