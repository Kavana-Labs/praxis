import latexFeaturesImg from "@/assets/latex-feature.svg";
import ICodeFeatureImg from "@/assets/icode-feature.svg";
import { ctaPrimary, ctaSecondary } from "./cta";

type WItemProps = {
  title: string;
  imageUrl: string;
  text: string;
};

const WItem: React.FC<WItemProps> = ({ title, imageUrl, text }) => {
  return (
    <div className="flex flex-col rounded-2xl border border-[#ECEBF3] bg-white p-6 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_28px_-8px_rgba(16,24,40,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(16,24,40,0.05),0_22px_44px_-12px_rgba(101,47,243,0.14)] sm:p-7">
      <div className="mb-6 flex min-h-[180px] items-center justify-center sm:min-h-[230px]">
        <img className="w-full" src={imageUrl} alt="" />
      </div>
      <h3 className="mb-2 text-[20px] font-semibold tracking-tight text-[#111827] sm:text-[22px]">
        {title}
      </h3>
      <p className="text-[15px] leading-relaxed text-[#6B7280]">{text}</p>
    </div>
  );
};

const whyItems: Array<WItemProps> = [
  {
    imageUrl: latexFeaturesImg,
    title: "LaTeX for Beautiful Equations",
    text: "Write and render LaTeX math as easily as text — from simple fractions to complex derivations.",
  },
  {
    imageUrl: ICodeFeatureImg,
    title: "Interactive Code & Plots",
    text: "Run Python, MATLAB, or Julia directly inside your slides, with interactive plots built in.",
  },
  {
    imageUrl: latexFeaturesImg,
    title: "Research-Grade Templates",
    text: "Professional templates for lectures, thesis defenses, conferences, and lab presentations.",
  },
];

const WhySection = () => {
  return (
    <section className="px-4 sm:px-6">
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[28px] border border-[#ECEBF3] bg-[#F7F6FB] px-5 py-14 text-center sm:px-10 sm:py-16 lg:rounded-[40px] lg:px-[69px] lg:py-20">
        {/* One clean, soft violet glow — replaces the stacked grid + colored blobs. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-140px] h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-[#652FF3]/[0.12] blur-[130px]"
        />

        <div className="relative">
          <h2 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[40px] lg:text-[48px]">
            Why Scientists Choose <span className="text-[#652FF3]">Praxis</span>
          </h2>
          <p className="mb-12 mt-4 text-[17px] text-[#4B5563] sm:text-[18px]">
            Tailored to scientific thinking
          </p>

          <div className="mx-auto grid max-w-[420px] grid-cols-1 gap-5 sm:gap-6 lg:max-w-none lg:grid-cols-3">
            {whyItems.map((item) => (
              <WItem key={item.title} {...item} />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-[18px] mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        <a href="/app" className={ctaPrimary}>
          Get Started
        </a>
        <a href="/editor" className={ctaSecondary}>
          Try Demo
        </a>
      </div>
      <p className="text-[16px] text-[#4B5563] sm:text-[18px]">
        <span className="font-semibold text-[#1F2937]">Trusted by</span> scientists,
        engineers &amp; educators worldwide
      </p>
    </section>
  );
};

export default WhySection;
