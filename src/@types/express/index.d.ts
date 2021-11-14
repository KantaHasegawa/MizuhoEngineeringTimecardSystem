declare namespace Express {
  export interface Request {
    userLocation: string;
    user: {
      name: string;
      role: string;
    };
  }
}
