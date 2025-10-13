
'use client';

import { SidebarProvider as Provider } from "@/components/ui/sidebar";

export function ClientSidebarProvider({ children }: { children: React.ReactNode }) {
    return (
        <Provider>
            {children}
        </Provider>
    )
}
