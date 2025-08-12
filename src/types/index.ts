
export interface Task {
  id: string;
  name: string;
  description?: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies: string[];
}

export interface Milestone {
    id: string;
    name: string;
    date: Date;
}
