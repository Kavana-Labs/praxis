import { Link } from "react-router-dom";
import { ROUTES } from "@/router/paths";

const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold">Access denied</h1>
        <p className="mt-3 text-slate-600">
          You do not have permission to view this page.
        </p>
        <Link className="mt-6 inline-block text-sm font-semibold text-[#652FF3]" to={ROUTES.home}>
          Go back home
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
