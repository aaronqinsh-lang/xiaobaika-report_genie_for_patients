
import React, { useState } from 'react';
import { ReportType, Language } from '../types';
import { CyberCard } from './CyberCard';
import { useStore } from '../store';

interface ReportUploaderProps {
  onUpload: (file: File, type: ReportType) => void;
}

export const ReportUploader: React.FC<ReportUploaderProps> = ({ onUpload }) => {
  const [selectedType, setSelectedType] = useState<ReportType>(ReportType.UNKNOWN);
  const [isDragging, setIsDragging] = useState(false);
  const { language } = useStore();

  const t = {
    ZH: {
      title: '上传医疗报告',
      category: '选择报告类别',
      dropzone: '点击上传或将文件拖拽至此',
      format: '支持 PNG, JPG, HEIC，最大 10MB',
      types: {
        [ReportType.BLOOD]: '血液报告',
        [ReportType.CT]: 'CT 扫描',
        [ReportType.MRI]: 'MRI 核磁',
        [ReportType.ULTRASOUND]: '超声波',
        [ReportType.TUMOR_MARKER]: '肿瘤标志物',
        [ReportType.LIVER_FUNCTION]: '肝功能',
        [ReportType.UNKNOWN]: '我不确定'
      }
    },
    EN: {
      title: 'Upload Medical Report',
      category: 'Select Category',
      dropzone: 'Tap to upload or drag & drop',
      format: 'PNG, JPG, HEIC up to 10MB',
      types: {
        [ReportType.BLOOD]: 'Blood Report',
        [ReportType.CT]: 'CT Scan',
        [ReportType.MRI]: 'MRI',
        [ReportType.ULTRASOUND]: 'Ultrasound',
        [ReportType.TUMOR_MARKER]: 'Tumor Markers',
        [ReportType.LIVER_FUNCTION]: 'Liver Function',
        [ReportType.UNKNOWN]: 'I am not sure'
      }
    }
  }[language];

  const reportTypes = [
    { value: ReportType.BLOOD, label: t.types[ReportType.BLOOD] },
    { value: ReportType.CT, label: t.types[ReportType.CT] },
    { value: ReportType.MRI, label: t.types[ReportType.MRI] },
    { value: ReportType.ULTRASOUND, label: t.types[ReportType.ULTRASOUND] },
    { value: ReportType.TUMOR_MARKER, label: t.types[ReportType.TUMOR_MARKER] },
    { value: ReportType.LIVER_FUNCTION, label: t.types[ReportType.LIVER_FUNCTION] },
    { value: ReportType.UNKNOWN, label: t.types[ReportType.UNKNOWN] },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0], selectedType);
    }
  };

  return (
    <CyberCard glow className="max-w-xl mx-auto">
      <h3 className="font-orbitron text-xl mb-4 text-[#e94560]">{t.title}</h3>
      
      <div className="mb-6">
        <label className="block text-xs uppercase tracking-widest text-white/50 mb-3">{t.category}</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {reportTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`text-xs py-2.5 px-2 rounded-xl transition-all border ${
                selectedType === type.value 
                ? 'border-[#e94560] bg-[#e94560]/20 text-white shadow-[0_0_10px_rgba(233,69,96,0.2)]' 
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.[0]) onUpload(e.dataTransfer.files[0], selectedType);
        }}
        className={`relative h-56 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all ${
          isDragging ? 'border-[#e94560] bg-[#e94560]/5' : 'border-white/10 bg-white/2 hover:bg-white/4'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
        />
        <div className="p-4 rounded-full bg-white/5 mb-3 group-hover:scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#e94560]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm text-white/70 font-medium">{t.dropzone}</p>
        <p className="text-[10px] text-white/30 mt-2 uppercase tracking-widest">{t.format}</p>
      </div>
    </CyberCard>
  );
};
