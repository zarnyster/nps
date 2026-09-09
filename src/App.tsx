import { BrowserRouter as Router, Routes, Route } from "react-router";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Reviews from "@/pages/Reviews";
import Upload from "@/pages/Upload";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="*"
        element={
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayout>
        }
      />
    </Routes>
  );
}
