"use client";
import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// 1. Dữ liệu tĩnh (Arrays & Strings) -> Đã kiểm tra ngoặc [] và ""

const TIME_SLOTS = ["10h00 -> 12h00", "12h00 -> 14h00", "14h00 -> 16h00", "16h00 -> 18h00", "18h00 -> 20h00"];
const DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const REQUIRED_SLOTS = [
  "Thứ 3-10h00 -> 12h00", "Thứ 3-12h00 -> 14h00", "Thứ 3-14h00 -> 16h00", 
  "Thứ 4-12h00 -> 14h00", "Thứ 4-14h00 -> 16h00", "Thứ 4-16h00 -> 18h00", 
  "Thứ 6-10h00 -> 12h00", "Thứ 6-12h00 -> 14h00", "Thứ 6-14h00 -> 16h00"
];
const OFF_SLOTS = ["Thứ 2", "Chủ nhật-10h00 -> 12h00", "Chủ nhật-12h00 -> 14h00", "Chủ nhật-18h00 -> 20h00"];

export default function OfficeScheduler() {
  // 2. Hooks -> Đã kiểm tra ngoặc () và Generics <>
  
const [userName, setUserName] = useState<string>("");
const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // <--- NEW CODE
const [commitHours, setCommitHours] = useState<string>("30");
  const [selectedOptional, setSelectedOptional] = useState<string[]>([]);
  const pdfExportRef = useRef<HTMLDivElement>(null);
  const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
};

  // 3. Logic tính toán
  const requiredHoursTotal = REQUIRED_SLOTS.length * 2;
  const optionalHoursTotal = selectedOptional.length * 2;
  const totalHours = requiredHoursTotal + optionalHoursTotal;
  const target = parseInt(commitHours || "0", 10);
  const isEnough = totalHours >= target && target > 0;

  // 4. Hàm xử lý sự kiện
  const toggleCell = (id: string) => {
    setSelectedOptional(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCommitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/^0+/, ''); 
    setCommitHours(val === "" ? "" : val);
  };

  // 5. Hàm xử lý dữ liệu cho PDF
  const getScheduleSummary = () => {
    const allSelected = [...REQUIRED_SLOTS, ...selectedOptional];
    // Map qua từng ngày để tạo range Start - End
    return DAYS.map(day => {
      const daySlots = TIME_SLOTS.filter(slot => allSelected.includes(`${day}-${slot}`));
      
      if (daySlots.length === 0) return { day, range: "Nghỉ" };

      const start = daySlots[0].split(" -> ")[0];
      const end = daySlots[daySlots.length - 1].split(" -> ")[1];
      
      return { day, range: `${start} - ${end}` };
    });
  };

  // 6. Hàm Xuất PDF -> Đã kiểm tra đóng mở async/await và try/catch
  const exportPDF = async () => {
    if (!pdfExportRef.current) return;
    
    pdfExportRef.current.style.display = "block"; // Hiện vùng ẩn

    try {
      const canvas = await html2canvas(pdfExportRef.current, { 
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`Lich_Lam_Viec_${userName.replace(/\s+/g, '_') || 'NhanVien'}.pdf`);
    } catch (err) {
      alert("Lỗi xuất PDF. Vui lòng thử lại.");
    } finally {
      pdfExportRef.current.style.display = "none"; // Ẩn lại
    }
  };

  // 7. Render JSX -> Đã kiểm tra đóng mở thẻ <div>, <table>, ngoặc nhọn {} trong style
  return (
    <div style={{ padding: '10px', backgroundColor: '#f1f5f9', minHeight: '100vh', color: '#000000', fontFamily: 'sans-serif' }}>
      
      <div style={{ maxWidth: '1100px', margin: '0 auto', backgroundColor: '#ffffff', padding: '15px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px', fontWeight: '900', color: '#1e3a8a', textTransform: 'uppercase', fontSize: '1.2rem' }}>
          Máy tính thời gian tham gia văn phòng
        </h1>
        
        {/* Input Tên nhân viên + Ngày nhập - STACKS ON MOBILE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>TÊN NHÂN VIÊN</label>
            <input 
              type="text" 
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Họ và tên..."
              style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', fontSize: '16px' }} // 16px prevents iOS zoom
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>NGÀY ÁP DỤNG</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Dashboard Thống kê - WRAPS ON MOBILE */}
        <div style={{ display: 'flex', flexWrap: 'wrap', border: '2px solid #000000', marginBottom: '30px' }}>
          <div style={{ flex: '1 1 50%', padding: '15px', borderRight: '1px solid #000000', borderBottom: '1px solid #000000', backgroundColor: '#f8fafc' }}>
            <span style={{ fontWeight: 'bold', fontSize: '10px', color: '#64748b' }}>SỐ GIỜ BẮT BUỘC</span>
            <div style={{ fontSize: '20px', fontWeight: '900' }}>{requiredHoursTotal}h</div>
          </div>
          <div style={{ flex: '1 1 50%', padding: '15px', borderBottom: '1px solid #000000' }}>
            <span style={{ fontWeight: 'bold', fontSize: '10px', color: '#64748b' }}>SỐ GIỜ CAM KẾT</span>
            <input 
              type="number" 
              value={commitHours}
              onChange={handleCommitChange}
              style={{ fontSize: '20px', fontWeight: '900', width: '100%', border: 'none', outline: 'none' }}
            />
          </div>
          <div style={{ flex: '1 1 50%', padding: '15px', backgroundColor: '#f8fafc', borderRight: '1px solid #000000' }}>
            <span style={{ fontWeight: 'bold', fontSize: '10px', color: '#64748b' }}>TỔNG GIỜ</span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: isEnough ? '#16a34a' : '#ea580c' }}>
              {totalHours}h / {target}h
            </div>
          </div>
          <div style={{ flex: '1 1 50%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isEnough ? '#16a34a' : '#1e293b', color: isEnough ? '#ffffff' : '#fdba74', textAlign: 'center' }}>
             <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{isEnough ? "✓ ĐỦ ĐIỀU KIỆN" : `THIẾU ${target - totalHours}H`}</span>
          </div>
        </div>

        {/* Bảng Tick chọn - SCROLLABLE FOR MOBILE */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid #94a3b8', borderRadius: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                <th style={{ border: '1px solid #94a3b8', padding: '12px' }}>Thời gian</th>
                {DAYS.map(day => (
                  <th key={day} style={{ border: '1px solid #94a3b8', padding: '12px', fontSize: '12px' }}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map(time => (
                <tr key={time}>
                  <td style={{ border: '1px solid #94a3b8', padding: '10px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc', fontSize: '11px' }}>{time}</td>
                  {DAYS.map(day => {
                    const id = `${day}-${time}`;
                    const isOff = OFF_SLOTS.some(off => id.includes(off));
                    const isRequired = REQUIRED_SLOTS.includes(id);
                    const isSelected = selectedOptional.includes(id);
                    
                    if (isOff) return <td key={id} style={{ border: '1px solid #94a3b8', backgroundColor: '#e2e8f0', textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>Nghỉ</td>;
                    if (isRequired) return <td key={id} style={{ border: '1px solid #94a3b8', backgroundColor: '#fef9c3', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>Bắt buộc</td>;
                    
                    return (
                      <td key={id} 
                          onClick={() => toggleCell(id)}
                          style={{ border: '1px solid #94a3b8', textAlign: 'center', padding: '15px', cursor: 'pointer', backgroundColor: isSelected ? '#dcfce7' : '#ffffff' }}>
                        <input type="checkbox" checked={isSelected} readOnly style={{ width: '22px', height: '22px' }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ textAlign: 'center', marginTop: '10px', color: '#64748b', fontSize: '12px' }}>
          ← Vuốt sang ngang để xem đủ các ngày →
        </div>
      </div>

      <button 
        onClick={exportPDF}
        disabled={!isEnough}
        style={{ 
          maxWidth: '1100px', margin: '20px auto', display: 'block', width: '100%', padding: '18px', 
          borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: isEnough ? 'pointer' : 'not-allowed',
          backgroundColor: isEnough ? '#2563eb' : '#cbd5e1', color: isEnough ? '#ffffff' : '#64748b', fontSize: '16px'
        }}
      >
        {isEnough ? "XUẤT LỊCH (PDF)" : "VUI LÒNG CHỌN ĐỦ GIỜ"}
      </button>

      {/* PDF HIDDEN AREA - Unchanged to maintain export quality */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={pdfExportRef} style={{ width: '800px', minHeight: '1000px', padding: '50px', backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>LỊCH LÀM VIỆC CHÍNH THỨC</h1>
            <p style={{ textAlign: 'center', fontSize: '14px', marginBottom: '30px' }}>
                Nhân viên: <strong>{userName}</strong> | Ngày áp dụng: <strong>{formatDate(selectedDate)}</strong>
            </p>
            <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '15px 0', marginBottom: '30px', display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Giờ cam kết:</strong> {target} giờ</span>
                <span><strong>Tổng giờ đăng ký:</strong> {totalHours} giờ</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                        <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'left' }}>Ngày trong tuần</th>
                        <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'left' }}>Khung giờ làm việc</th>
                    </tr>
                </thead>
                <tbody>
                    {getScheduleSummary().map(item => (
                        <tr key={item.day}>
                            <td style={{ border: '1px solid #000', padding: '12px', fontWeight: 'bold' }}>{item.day}</td>
                            <td style={{ border: '1px solid #000', padding: '12px', color: item.range === 'Nghỉ' ? '#999' : '#000' }}>{item.range}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}