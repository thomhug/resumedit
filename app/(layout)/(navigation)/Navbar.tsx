import { Logo } from "@/components/custom/Logo";
import { User as PrismaUser } from "@prisma/client";
import Link from "next/link";
import ActionButtons from "./action-buttons";
import { MenuBar } from "./navigation-menu";

const Navbar = ({ user }: { user?: PrismaUser }) => {
  return (
    <div className="pt-8 pb-4 flex flex-wrap gap-x-4 gap-y-4 justify-between">
      <div className="flex flex-wrap gap-x-4 gap-y-4">
        <Link href="/">
          <Logo className="mr-8" />
        </Link>
        <MenuBar />
      </div>
      <ActionButtons user={user} />
    </div>
  );
};

export default Navbar;