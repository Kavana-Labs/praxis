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
        <div className={`${colSpan ? 'w-full lg:col-span-2' : 'w-full max-w-[380px]'} relative flex flex-col overflow-hidden rounded-[24px] border border-1 border-[#202023] bg-[#0A0A0A52] p-6 text-left shadow-[inset_0_-34px_64px_0_rgba(255,255,255,0.16)] sm:p-[32px]`}>
            {bgMask && <img className="pointer-events-none absolute right-[-50px] top-0" src={bgMask} alt="" />}
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
        title: "LaTex Mathemattics",
        tag: <Tag name="Mathematics" color="#652FF3" />,
        text: "White and render LaTex math as easily as text from simple fractions to complex derrivations",
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
        text: "White and render LaTex math as easily as text from simple fractions to complex derivations",
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

const FeaturesSection = () => {
    return (
        <div className="mx-auto mt-16 max-w-[1320px] rounded-[32px] bg-[#060606] px-4 pb-12 pt-20 text-center text-white sm:mt-[118px] sm:rounded-[48px] sm:pt-[150px]">
            <p className="mb-[32px] text-[30px] font-bold text-white sm:text-[40px] lg:text-[48px]">Everything You Need for<br /> <span className="text-[#C4BCFB]">Scientific Presentations</span></p>
            <p className="mb-12 text-[16px] font-[400] sm:mb-[79px] sm:text-[18px]">Professional-grade tools designed specifically for STEM education, research, and engineering documentation.</p>


            <div className="mb-8 flex flex-col items-center gap-6 lg:flex-row lg:flex-wrap lg:items-stretch lg:justify-center lg:gap-[24px]">
                {featureListA.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
            </div>

            <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
                {featureListB.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
            </div>
        </div>
    )
}


export default FeaturesSection;
