
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { SheetHeader, SheetTitle, SheetDescription, SheetFooter } from './ui/sheet';
import { Trash2, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


export default function TeamManager() {
  const teamMembers = [
    { id: '1', name: 'Alex Johnson', email: 'alex@example.com', avatar: '/avatars/01.png' },
    { id: '2', name: 'Maria Garcia', email: 'maria@example.com', avatar: '/avatars/02.png' },
    { id: '3', name: 'James Smith', email: 'james@example.com', avatar: '/avatars/03.png' },
  ];

  return (
    <>
      <SheetHeader>
        <SheetTitle>Manage Team</SheetTitle>
      </SheetHeader>
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>Add New Member</span>
                        <UserPlus className="h-5 w-5 text-muted-foreground" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="new-member-name">Name</Label>
                        <Input id="new-member-name" placeholder="e.g., Jane Doe" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="new-member-email">Email</Label>
                        <Input id="new-member-email" type="email" placeholder="e.g., jane.doe@example.com" />
                    </div>
                    <Button className="w-full">Add to Team</Button>
                </CardContent>
            </Card>

            <h3 className="text-lg font-semibold pt-4">Current Members ({teamMembers.length})</h3>
            <div className="space-y-3">
                {teamMembers.map(member => (
                    <Card key={member.id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={member.avatar} alt={member.name} />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{member.name}</p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </Card>
                ))}
            </div>
        </div>
      </ScrollArea>
       <SheetFooter>
        <Button variant="outline">Close</Button>
      </SheetFooter>
    </>
  );
}

