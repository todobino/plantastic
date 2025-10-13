
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GanttChartSquare } from 'lucide-react';
import { DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from './ui/dialog';

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

export function AuthForm() {
  const [isPending, setIsPending] = useState(false);

  const loginForm = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onLoginSubmit = (data: LoginSchema) => {
    setIsPending(true);
    console.log('Login data:', data);
    setTimeout(() => {
        console.log('Login Successful');
        setIsPending(false);
    }, 1000)
  };

  const onSignupSubmit = (data: SignupSchema) => {
    setIsPending(true);
    console.log('Signup data:', data);
     setTimeout(() => {
        console.log('Signup Successful');
        setIsPending(false);
    }, 1000)
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
            <div className="flex justify-center items-center gap-3 mb-2">
                <GanttChartSquare className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight text-foreground font-headline">
                Ganttastic
                </h1>
            </div>
        </DialogTitle>
        <DialogDescription className="text-center">
            Quick and Easy Project Management
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
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
                <DialogFooter>
                    <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? 'Logging in...' : 'Login'}
                    </Button>
                </DialogFooter>
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
                <DialogFooter>
                    <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? 'Signing up...' : 'Sign Up'}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
    </DialogBody>
    </>
  );
}
