import './style.css';import type {Metadata} from 'next';
export const metadata:Metadata={title:'ABYSS OCEAN — Enter the living deep',description:'A persistent multiplayer underwater survival game. Collect your fish. Find your place in the ocean.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
