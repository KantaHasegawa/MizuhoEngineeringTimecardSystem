// export { };
// declare global {
//   namespace Express {
//     export interface Request {
//       userLocation: String,
//       user: {
//         name: String,
//         role: String
//       }
//     }
//   }
// }
declare namespace Express {
  export interface Request {
    userLocation: string;
    user: {
      name: string;
      role: string;
    };
  }
}
