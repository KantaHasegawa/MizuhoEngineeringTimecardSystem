import csrf from "csurf";

const csrfProtection = csrf({
  cookie: { maxAge: 300000 },
});

export default csrfProtection;
