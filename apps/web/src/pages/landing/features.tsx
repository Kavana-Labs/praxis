import { Sigma, Cpu, FlaskConical } from "lucide-react";
import latexFeatureSample from "@/assets/latex-feature-sample.svg"
import circuitDiagramSample from "@/assets/circuit-diagram-feature.svg";
import chemistrySample from "@/assets/chemistry-feature.svg";
import circuitBgMask from "@/assets/circuit-bg-mask.svg";
import codeSimFeature from "@/assets/code-sim-feature.svg";
import graphPlotFeature from "@/assets/graph-plot-feature.svg"


type FeatureProps = {
    categoryIcon: React.ReactNode,
    tag: React.ReactNode,
    title: string,
    text: string,
    imageUrl: string,
    bgMask?: string,
    colSpan?: boolean | false;
};

type TagProps = {
    color: string,
    name: string,
}


const Tag: React.FC<TagProps> = ({ color, name }) => {
    return <span style={{ borderColor: color, color: color }} className="rounded-[16px] border border-dashed px-[12px] py-[8px] text-sm">{name}</span>
}

const FeatureCard: React.FC<FeatureProps> = ({ categoryIcon, tag, title, text, imageUrl, bgMask, colSpan }) => {

    return (
        <div className={`${colSpan ? 'lg:col-span-2' : ''} relative flex w-full flex-col overflow-hidden rounded-[24px] border border-[#1E1E22] bg-[#0C0C0E]/60 p-6 text-left shadow-[inset_0_-40px_72px_-36px_rgba(196,188,251,0.16)] transition-colors duration-300 hover:border-[#2C2C33] sm:p-8`}>
            {bgMask && <img className="pointer-events-none absolute right-[-50px] top-0 opacity-90" src={bgMask} alt="" />}
            <div className="mb-[24px] flex items-start justify-between">
                {categoryIcon}
                {tag}
            </div>
            <p className="mb-[16px] text-[20px] font-[500] sm:text-[22px]">{title}</p>
            <p className="mb-[32px] text-[16px] font-[300] text-[#D1D5DB]">{text}</p>
            <img className="mt-auto max-h-[192px] w-full object-contain" src={imageUrl} alt="" />
        </div>
    );
}

const featureListA: Array<FeatureProps> = [
    {
        categoryIcon: <div className="bg-[#F2EEFF] rounded-[12px] p-[8px]"><Sigma color="#652FF3" size={24} /></div>,
        title: "LaTeX Mathematics",
        tag: <Tag name="Mathematics" color="#652FF3" />,
        text: "Write and render LaTeX math as easily as text — from simple fractions to complex derivations.",
        imageUrl: latexFeatureSample,
    },
    {
        categoryIcon: <div className="bg-[#FFF5EE] rounded-[12px] p-[8px]"><Cpu color="#FF6A00" /></div>,
        title: "Circuit Diagrams",
        tag: <Tag name="Engineering" color="#FFAB6E" />,
        text: "Professional electronic circuit symbols and schematic design tools.",
        imageUrl: circuitDiagramSample,
        bgMask: circuitBgMask,
    },
    {
        categoryIcon: <div className="bg-[#E6FFF3] rounded-[12px] p-[8px]"><FlaskConical color="#12B164" /></div>,
        title: "Chemical Structure",
        tag: <Tag name="Chemistry" color="#12B164" />,
        text: "ChemDraw-like toolkit for molecular structures and chemical formulas.",
        imageUrl: chemistrySample,
    },]
const featureListB: Array<FeatureProps> = [
    {
        categoryIcon: <div className="bg-[#E6FFF3] rounded-[12px] p-[8px]"><FlaskConical color="#12B164" /></div>,
        title: "Code Simulation",
        tag: <Tag name="Computation" color="#F3F08E" />,
        text: "Run Python, MATLAB, or Julia simulations inline and see live output right on your slide.",
        imageUrl: codeSimFeature,
        colSpan: true,
    },
    {
        categoryIcon: <div className="bg-[#E6FFF3] rounded-[12px] p-[8px]"><FlaskConical color="#12B164" /></div>,
        title: "Graph Plotting",
        tag: <Tag name="Mathematics" color="#B6A8FC" />,
        text: "Interactive 2D and 3D graphs, charts, and data visualizations.",
        imageUrl: graphPlotFeature,
    }
]

/** Circular Greek-letter badge with a violet glow, per the Figma showcase. */
const GreekBadge: React.FC<{ char: string; size: number; fontSize: number; z: number }> = ({
    char,
    size,
    fontSize,
    z,
}) => (
    <div className="relative -mx-2" style={{ width: size, height: size, zIndex: z }}>
        <span
            aria-hidden
            className="pointer-events-none absolute -inset-2.5 rounded-full bg-[#652FF3]/30 blur-lg"
        />
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-[#7D7D89]/80 bg-[#0A0A0A] shadow-[0_8px_34px_rgba(0,0,0,0.85)]">
            <span className="font-semibold leading-none text-[#D1D5DB]" style={{ fontSize }}>
                {char}
            </span>
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_-12px_22px_rgba(255,255,255,0.05)]"
            />
        </div>
    </div>
);

const greekLetters = [
    { char: "α", size: 64, fontSize: 28, z: 10 },
    { char: "β", size: 80, fontSize: 36, z: 20 },
    { char: "γ", size: 100, fontSize: 46, z: 30 },
    { char: "Δ", size: 80, fontSize: 36, z: 20 },
    { char: "λ", size: 64, fontSize: 28, z: 10 },
];

const GreekLettersRow = () => (
    <div className="relative mx-auto mt-6 flex w-full max-w-[1180px] flex-col items-center gap-6 overflow-hidden rounded-[24px] border border-[#1E1E22] bg-[#0C0C0E]/60 px-8 py-8 shadow-[inset_0_-40px_72px_-36px_rgba(196,188,251,0.16)] sm:flex-row sm:justify-start sm:gap-10 sm:py-6">
        <h3 className="text-[20px] font-semibold tracking-tight text-white sm:text-[22px]">
            Greek Letters
        </h3>
        <div className="flex items-center">
            {greekLetters.map((g) => (
                <GreekBadge key={g.char} {...g} />
            ))}
        </div>
        <span
            aria-hidden
            className="pointer-events-none absolute bottom-[-50px] left-1/2 h-[130px] w-[55%] -translate-x-1/2 rounded-full bg-[#652FF3]/[0.14] blur-3xl"
        />
    </div>
);

const FeaturesSection = () => {
    return (
        <div className="mx-auto mt-16 max-w-[1320px] rounded-[32px] bg-[#060606] px-4 pb-12 pt-20 text-center text-white sm:mt-[118px] sm:rounded-[48px] sm:pt-[150px]">
            <p className="mb-[32px] text-[30px] font-bold tracking-tight text-white sm:text-[40px] lg:text-[48px]">Everything You Need for<br /> <span className="text-[#C4BCFB]">Scientific Presentations</span></p>
            <p className="mb-12 text-[16px] font-[400] text-[#D1D5DB] sm:mb-[79px] sm:text-[18px]">Professional-grade tools designed specifically for STEM education, research, and engineering documentation.</p>


            <div className="mx-auto mb-6 grid w-full max-w-[1180px] grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
                {featureListA.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
            </div>

            <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
                {featureListB.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
            </div>

            <GreekLettersRow />
        </div>
    )
}


export default FeaturesSection;
