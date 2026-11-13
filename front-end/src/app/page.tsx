"use client";

import Scene from "@/components/Three/Scene";
import City from "@/components/Three/City";
import Workspace from "@/components/Workspace/Workspace";

export default function Home() {
  return (
    <Workspace>
      <Scene>
        <City />
      </Scene>
    </Workspace>
  );
}
