export interface User {
  id: number;
  username: string;
  name: string;
  role: "Admin" | "Sevadar";
  assignedAreas: string[];
}
