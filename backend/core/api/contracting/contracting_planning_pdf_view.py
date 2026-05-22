import logging
import io
from django.http import HttpResponse
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from core.models import Project

logger = logging.getLogger(__name__)


class ContractingPlanningPDFView(generics.GenericAPIView):
    """
    Convert HTML content to PDF
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser]
    
    def post(self, request, project_id):
        """
        Generate PDF from HTML content.
        
        Request body:
        {
            "html_content": "<html>...</html>",
            "filename": "renovation_plan.pdf"
        }
        
        Returns: PDF file as downloadable response
        """
        # Verify the project exists and belongs to the user
        try:
            project = Project.objects.get(id=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response(
                {'detail': 'Project not found or you do not have permission to access it'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get HTML content and filename from request
        html_content = request.data.get('html_content', '')
        filename = request.data.get('filename', 'renovation_plan.pdf')
        
        if not html_content:
            return Response(
                {'detail': 'html_content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure filename ends with .pdf
        if not filename.endswith('.pdf'):
            filename += '.pdf'
        
        try:
            # Import WeasyPrint
            from weasyprint import HTML, CSS
            
            logger.info(f"Generating PDF from HTML content (length: {len(html_content)})")
            
            # Add some default styling for better PDF rendering
            default_css = CSS(string='''
                @page {
                    size: A4;
                    margin: 2cm;
                }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 11pt;
                    line-height: 1.5;
                    color: #000;
                }
                h1 {
                    font-size: 20pt;
                    margin-top: 0;
                    margin-bottom: 0.5em;
                }
                h2 {
                    font-size: 16pt;
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                }
                h3 {
                    font-size: 14pt;
                    margin-top: 0.8em;
                    margin-bottom: 0.4em;
                }
                p {
                    margin-bottom: 0.5em;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin-bottom: 1em;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
            ''')
            
            # Convert HTML to PDF
            html_obj = HTML(string=html_content)
            pdf_bytes = html_obj.write_pdf(stylesheets=[default_css])
            
            # Create HTTP response with PDF
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            logger.info(f"Successfully generated PDF: {filename}")
            return response
            
        except ImportError:
            logger.error("WeasyPrint not installed")
            return Response(
                {'detail': 'PDF generation service not available. WeasyPrint is not installed.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Error generating PDF: {str(e)}", exc_info=True)
            return Response(
                {'detail': 'Failed to generate PDF', 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
