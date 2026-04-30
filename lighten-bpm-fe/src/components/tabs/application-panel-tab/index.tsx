import { Application, OverallStatus } from "@/types/application";
import { useMemo, useState } from "react";
import ApplicationProgress from "./progress-tab-content";
import ApplicationShare from "./share-tab-content";
import TabButton from "./tab-button";
import { ApplicationStatusTag } from "@/components/application-status-tag";
import { ChevronRight } from "lucide-react";
import { BottomSheet, useDrawer } from "@ui/drawer";

type Props = {
  application: Application;
};

const tabItems = [
  {
    key: "progress",
    label: "Approval progress",
    render: (application: Application) => (
      <ApplicationProgress application={application} />
    ),
  },
  //   {
  //     key: "comment",
  //     label: "Comment",
  //     render: () => <div>wait for implementation</div>,
  //   },
  {
    key: "share",
    label: "Share",
    render: (application: Application) => (
      <ApplicationShare application={application} />
    ),
  },
];

export default function ApplicationPanelTab({ application }: Props) {
  const [activeKey, setActiveKey] = useState(tabItems[0]?.key ?? "progress");
  const activeTab = useMemo(
    () => tabItems.find((item) => item.key === activeKey) ?? tabItems[0],
    [activeKey],
  );
  const drawer = useDrawer();

  return (
    <>
      {/* desktop view */}
      <div className="max-w-[476px] w-full lg:block hidden bg-gray-2 h-full">
        <div className="flex flex-col h-full">
          <div className="w-full h-14 bg-white border-b border-stroke">
            <div className="w-[475px] pl-5 py-[13px] inline-flex justify-start items-center gap-3 overflow-x-scroll">
              {tabItems.map((item) => (
                <TabButton
                  key={item.key}
                  active={activeKey === item.key}
                  onClick={() => setActiveKey(item.key)}
                >
                  {item.label}
                </TabButton>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-gray-2">
            {activeTab?.render(application)}
          </div>
        </div>
      </div>
      {/* mobile view */}
      <div className="lg:hidden block md:px-16 md:pt-16 pt-4 px-4 w-full">
        <button
          className="flex flex-row gap-1 px-4 py-2.5 bg-white rounded-md justify-between w-full"
          onClick={() => drawer.open()}
        >
          <div>overall progress</div>
          <div className="flex flex-row gap-1">
            <ApplicationStatusTag status={application?.overallStatus} />
            <ChevronRight className="text-primary-text" />
          </div>
        </button>
        <BottomSheet
          isOpen={drawer.isOpen}
          onClose={drawer.close}
          maxHeight="90dvh"
        >
          <div className="max-h-[90dvh] min-h-[40dvh] overflow-y-auto bg-gray-2 rounded-t-2xl overflow-clip">
            <div className="flex flex-col h-full">
              <div className="w-full h-14 bg-white border-b border-stroke">
                <div className="w-[475px] pl-5 py-[13px] inline-flex justify-start items-center gap-3 overflow-x-scroll">
                  {tabItems.map((item) => (
                    <TabButton
                      key={item.key}
                      active={activeKey === item.key}
                      onClick={() => setActiveKey(item.key)}
                    >
                      {item.label}
                    </TabButton>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-h-0 bg-gray-2">
                {activeTab?.render(application)}
              </div>
            </div>
          </div>
        </BottomSheet>
      </div>
    </>
  );
}
