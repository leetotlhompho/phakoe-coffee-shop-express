import { useEffect,useRef } from "react";
import { Navigate,Route,Routes,useLocation } from "react-router-dom";
import {useShop} from "./context/ShopContext.jsx";import {useAuth} from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";import Footer from "./components/Footer.jsx";import Home from "./pages/Home.jsx";import Menu from "./pages/Menu.jsx";import Cart from "./pages/Cart.jsx";import About from "./pages/About.jsx";import StaffDashboard from "./pages/StaffDashboard.jsx";import StaffLogin from "./pages/StaffLogin.jsx";import TrackOrder from "./pages/TrackOrder.jsx";import {ShopProvider} from "./context/ShopContext.jsx";import {AuthProvider} from "./context/AuthContext.jsx";
// Every visit to the staff area or the Track order page starts signed out:
// moving to any other page ends the staff / customer sign-in.
function SessionReset(){
  const {pathname}=useLocation();const {logout}=useAuth();const {trackLogout}=useShop();const previous=useRef(pathname);
  useEffect(()=>{
    const was=previous.current;previous.current=pathname;
    if(was===pathname)return;
    if(was.startsWith("/staff")&&!pathname.startsWith("/staff"))logout();
    if(was.startsWith("/track")&&!pathname.startsWith("/track"))trackLogout();
  },[pathname]);
  return null;
}
export default function App(){return <AuthProvider><ShopProvider><SessionReset/><div className="app-shell"><Navbar/><main className="main-content"><Routes><Route path="/" element={<Home/>}/><Route path="/menu" element={<Menu/>}/><Route path="/cart" element={<Cart/>}/><Route path="/about" element={<About/>}/><Route path="/track" element={<TrackOrder/>}/><Route path="/staff" element={<StaffDashboard/>}/><Route path="/staff/login" element={<StaffLogin/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></main><Footer/></div></ShopProvider></AuthProvider>}
