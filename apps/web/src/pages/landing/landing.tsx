import Header from "../../components/header"
import HeroSection from "../landing/hero-section"
import ProductShowcase from "./product-showcase";
import WhySection from "./why";
import FeaturesSection from "./features";
import EndingSection from "./ending";
import Footer from "./footer";

const Landing = () => {
    return (
        <div>
            <div className="max-w-[1440px] mx-auto">
                <Header />
                <HeroSection />
                <ProductShowcase />
                <WhySection />
                <FeaturesSection />
                <EndingSection />
            </div>
            <Footer />
        </div>
    )
}

export default Landing
