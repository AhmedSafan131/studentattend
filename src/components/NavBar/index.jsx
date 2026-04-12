// import React, { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { About, Contact, Home, Logo, Projects } from "../../assets";

// const NavBar = () => {
//   const [isMenuOpen, setIsMenuOpen] = useState(false);
//   const location = useLocation();

//   const navItems = [
//     { name: "Home", path: "/", icon: Home },
//     { name: "About", path: "/about", icon: About },
//     { name: "Projects", path: "/projects", icon: Projects },
//     { name: "Contact", path: "/contact", icon: Contact },
//   ];

//   const isActive = (path) => location.pathname === path;

//   return (
//     <>
//       {/* Desktop Navbar */}
//       <nav className="w-full z-50 bg-gradient-to-r from-blue to-mint-blue text-white py-4 px-5 shadow-lg md:block hidden">
//         <div className="container mx-auto flex justify-between items-center">
//           {/* Logo */}
//           <Link
//             to="/"
//             className="text-2xl flex items-center font-bold text-light-pink transition duration-300"
//           >
//             <img src={Logo} alt="Logo" className="mr-2" />
//             <h3>Portfolio</h3>
//           </Link>

//           {/* Desktop Links */}
//           <ul className="flex space-x-6">
//             {navItems.map((item) => (
//               <li key={item.path}>
//                 <Link
//                   to={item.path}
//                   className={`group relative flex items-center px-4 py-2 transition duration-300 text-light-pink ${
//                     isActive(item.path) ? "font-semibold" : ""
//                   }`}
//                 >
//                   <img
//                     src={item.icon}
//                     alt={item.name}
//                     width={25}
//                     className={`mr-2 transition duration-300 ${
//                       isActive(item.path)
//                         ? "brightness-150"
//                         : "group-hover:brightness-150"
//                     }`}
//                   />
//                   {item.name}
//                   <span
//                     className={`absolute bottom-0 left-0 h-[2px] bg-light-pink transition-all duration-500 ${
//                       isActive(item.path) ? "w-full" : "w-0 group-hover:w-full"
//                     }`}
//                   ></span>
//                 </Link>
//               </li>
//             ))}
//           </ul>
//         </div>
//       </nav>

//       {/* Mobile Bottom Navigation */}
//       <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-2xl m-2 opacity-95 bg-mint-blue border-separate border-light-pink shadow-lg flex justify-around py-2 px-3">
//         {navItems.map((item) => (
//           <Link
//             key={item.path}
//             to={item.path}
//             className={`flex flex-col items-center justify-center w-16 py-1 px-2 rounded-xl transition-all duration-300 ${
//               isActive(item.path)
//                 ? "bg-mint-green text-light-pink shadow-md"
//                 : "bg-mint-blue text-light-pink border border-light-pink hover:bg-blue hover:text-light-pink"
//             }`}
//           >
//             <img
//               src={item.icon}
//               alt={item.name}
//               width={22}
//               className={`mb-1 transition duration-300 ${
//                 isActive(item.path) ? "brightness-125" : "opacity-90"
//               }`}
//             />
//             <span className="text-[11px] font-bold">{item.name}</span>
//           </Link>
//         ))}
//       </div>
//     </>
//   );
// };

// export default NavBar;
