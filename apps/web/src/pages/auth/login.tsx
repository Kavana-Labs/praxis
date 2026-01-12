import mathBackground from "@/assets/math_background.png"

const LoginPage = () => {
  return (
    <section>
      <img
          className="fixed left-0 -z-10 motion-safe:animate-[float_24s_ease-in-out_infinite] pointer-events-none"
          src={mathBackground}
          alt=""
          aria-hidden="true"
          decoding="async"
      />
      
    </section>
  );
};

export default LoginPage;
