const loadAmplifyAuth = () => import("aws-amplify/auth");

export async function startGoogleAuthRedirect() {
  const { signInWithRedirect } = await loadAmplifyAuth();

  return signInWithRedirect({ provider: "Google" });
}

export async function signInWithEmailPassword({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const { signIn } = await loadAmplifyAuth();

  return signIn({
    username: email.toLowerCase(),
    password,
  });
}

export async function signUpWithEmailPassword({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  const { signUp } = await loadAmplifyAuth();
  const normalizedEmail = email.toLowerCase();

  return signUp({
    username: normalizedEmail,
    password,
    options: {
      userAttributes: {
        email: normalizedEmail,
        name,
        preferred_username: normalizedEmail,
      },
    },
  });
}

export async function confirmEmailSignUp({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  const { confirmSignUp } = await loadAmplifyAuth();

  return confirmSignUp({
    username: email,
    confirmationCode: code,
  });
}
