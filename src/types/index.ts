
export interface Task {
  id: string;
  name: string;
  description?: string;
  start: Date;
  end: Date;
  dependencies: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface Milestone {
    id: string;
    name: string;
    date: Date;
}
