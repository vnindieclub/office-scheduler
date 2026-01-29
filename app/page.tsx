"use client";
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { getConfigFromNotion, getStaffList, submitSchedule } from './actions';

const TIME_SLOTS = ["10h00 -> 12h00", "12h00 -> 14h00", "14h00 -> 16h00", "16h00 -> 18h00", "18h00 -> 20h00"];
const DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

export default function App() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  if (!selectedTeam) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', backgroundColor: '#f1f5f9' }}>
        <h1 style={{ color: '#1e3a8a', fontSize: '24px', fontWeight: 'bold' }}>CHỌN ĐƠN VỊ LÀM VIỆC</h1>
        {["VietQ Media", "No Headliner", "Vietnam Indie Club"].map(team => (
          <button key={team} onClick={() => setSelectedTeam(team)} style={{ width: '320px', padding: '25px', fontSize: '18px', fontWeight: 'bold', borderRadius: '12px', border: 'none', backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
            {team}
          </button>
        ))}
      </div>
    );
  }
  return <OfficeScheduler teamName={selectedTeam} onBack={() => setSelectedTeam(null)} />;
}

function OfficeScheduler({ teamName, onBack }: { teamName: string, onBack: () => void }) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [staffList, setStaffList] = useState<{name: string, email: string, commitHours: number}[]>([]); // New state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [commitHours, setCommitHours] = useState("30");
  const [selectedOptional, setSelectedOptional] = useState<string[]>([]);
  const [configData, setConfigData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Load Config AND Filtered Staff List
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [config, staff] = await Promise.all([
        getConfigFromNotion(teamName),
        getStaffList(teamName) // Filtered by team in actions.ts
      ]);
      setConfigData(config);
      setStaffList(staff);
      setLoading(false);
    }
    load();
  }, [teamName]);

  const getBlockMeta = (day: string, range: string) => {
    const startTime = range.split("h")[0] + "h"; 
    const id = `${day}-${startTime}`;
    const match = configData.find(item => item.id === id);
    return match || { type: "Tự chọn", label: "" };
  };

  // FINAL CALCULATION: Sums all Mandatory blocks across the WHOLE week + user selections
  const totalHours = (() => {
    // 1. Count EVERY "Bắt buộc" block found in the entire configuration array
    const mandatoryTotalCount = configData.filter(item => item.type === "Bắt buộc").length;
    
    // 2. Count current user-selected optional blocks
    const optionalCount = selectedOptional.length;

    // Each block = 2 hours
    return (mandatoryTotalCount + optionalCount) * 2;
  })();

  const target = parseInt(commitHours || "0");
  const isEnough = totalHours >= target;

  const handleFinalSubmit = async () => {
    if (!userName || !userEmail) return alert("Vui lòng chọn Nhân viên");
    setIsSubmitting(true);
  
  const weeklyShifts: any[] = [];

  // Iterate through all 7 days to collect the full week
  DAYS.forEach(day => {
    TIME_SLOTS.forEach(range => {
      const meta = getBlockMeta(day, range);
      const id = `${day}-${range.split("h")[0]}h`;
      
      // Using "Bắt buộc" as agreed
      if (meta.type === "Bắt buộc") {
        weeklyShifts.push({ day, time: range.replace(" -> ", "-"), type: "Bắt buộc" });
      } else if (selectedOptional.includes(id)) {
        weeklyShifts.push({ day, time: range.replace(" -> ", "-"), type: "Tự chọn" });
      }
    });
  });

  try {
    const canvas = await html2canvas(pdfRef.current!, { scale: 2, useCORS: true });
    const base64Data = canvas.toDataURL('image/png').split(',')[1];
    
    // Pass the full weeklyShifts array to actions.ts
    const result = await submitSchedule(
      teamName, 
      { userName, userEmail, selectedDate, allShifts: weeklyShifts, totalHours }, 
      base64Data
    );

    if (result.success) alert("Thành công! Toàn bộ lịch tuần đã được gửi.");
    else alert("Thất bại.");
  } catch (e) {
    alert("Lỗi khi xử lý.");
  } finally {
    setIsSubmitting(false);
  }
};

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Đang tải cấu hình Notion...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', cursor: 'pointer' }}>← Quay lại</button>
      
      <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <h2 style={{ textAlign: 'center', color: '#1e3a8a', marginBottom: '30px' }}>LỊCH CÔNG TÁC TUẦN: {teamName.toUpperCase()}</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '30px' }}>
         {/* UPDATED: SELECT DROPDOWN INSTEAD OF INPUT */}
          <div>
            <label style={{fontSize: '11px', fontWeight: 'bold'}}>CHỌN NHÂN VIÊN</label>
            <select 
              value={userName} 
              onChange={e => {
                const staff = staffList.find(s => s.name === e.target.value);
                setUserName(staff?.name || "");
                setUserEmail(staff?.email || "");
                if (staff) {
      setCommitHours(staff.commitHours.toString());
    }
              }}
              style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff' }}
            >
              <option value="">-- Chọn tên --</option>
              {staffList.map((s, idx) => (
  <option key={`${s.email}-${idx}`} value={s.name}>
    {s.name}
  </option>
))}
            </select>
          </div>
          <div>
            <label style={{fontSize: '11px', fontWeight: 'bold'}}>EMAIL</label>
            <input type="email" placeholder="email@congty.com" value={userEmail} onChange={e => setUserEmail(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          </div>
          <div>
            <label style={{fontSize: '11px', fontWeight: 'bold'}}>NGÀY ÁP DỤNG</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #1e293b', borderRadius: '8px', marginBottom: '30px' }}>
          <div style={{ padding: '20px', borderRight: '1px solid #1e293b' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>TỔNG GIỜ CẢ TUẦN</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: isEnough ? '#16a34a' : '#ef4444' }}>{totalHours}h / {target}h</div>
          </div>
          <div style={{ padding: '20px', backgroundColor: '#1e293b', color: '#fff' }}>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>CAM KẾT TUẦN</div>
            <input type="number" value={commitHours} readOnly onChange={e => setCommitHours(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '32px', fontWeight: 'bold', width: '100px', outline: 'none', cursor: 'not-allowed' }} />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#1e293b', color: '#fff' }}>
            <tr>
              <th style={{ padding: '15px', border: '1px solid #334155' }}>Thời gian</th>
              {DAYS.map(day => <th key={day} style={{ padding: '15px', border: '1px solid #334155' }}>{day}</th>)}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(range => (
              <tr key={range}>
                <td style={{ padding: '15px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>{range}</td>
                {DAYS.map(day => {
                  const meta = getBlockMeta(day, range);
                  const id = `${day}-${range.split("h")[0]}h`;
                  const isSelected = selectedOptional.includes(id);
                  let bg = "#fff";
                  if (meta.type === "Nghỉ") bg = "#f1f5f9";
                  else if (meta.type === "Bắt buộc") bg = "#fef9c3";
                  else if (isSelected) bg = "#dcfce7";

                  return (
                    <td key={id} onClick={() => meta.type === "Tự chọn" && setSelectedOptional(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
                        style={{ border: '1px solid #e2e8f0', backgroundColor: bg, textAlign: 'center', cursor: meta.type === "Tự chọn" ? 'pointer' : 'default', height: '60px' }}>
                      {meta.type === "Tự chọn" ? (
                        <input type="checkbox" checked={isSelected} readOnly style={{ cursor: 'pointer' }} />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '10px' }}>
                           <span style={{ fontWeight: 'bold', color: '#475569' }}>{meta.label || meta.type}</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={handleFinalSubmit} disabled={!isEnough || isSubmitting} style={{ width: '100%', padding: '20px', marginTop: '30px', backgroundColor: isEnough ? '#1e293b' : '#cbd5e1', color: '#fff', fontWeight: 'bold', borderRadius: '8px', cursor: isEnough ? 'pointer' : 'not-allowed', border: 'none' }}>
          {isSubmitting ? "ĐANG GỬI..." : "SUBMIT"}
        </button>
      </div>

      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div ref={pdfRef} style={{ width: '850px', padding: '50px', background: '#fff', color: '#000', fontFamily: 'sans-serif' }}>
          <h1 style={{ borderBottom: '3px solid #1e3a8a', paddingBottom: '15px' }}>BÁO CÁO LỊCH TUẦN - {teamName.toUpperCase()}</h1>
          <div style={{ marginTop: '20px', fontSize: '18px' }}>
            <p><strong>Nhân viên:</strong> {userName}</p>
            <p><strong>Ngày áp dụng:</strong> {selectedDate}</p>
            <p><strong>Tổng giờ tuần:</strong> {totalHours}h / {commitHours}h</p>
          </div>
        </div>
      </div>
    </div>
  );
}